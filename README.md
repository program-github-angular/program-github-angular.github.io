The website shows a demo web gis app made using ArcGIS Maps SDK for JavaScript version 4.30, and is set in a Bootstrap template.

**Notes on GN Tasks**
- Develop a web mapping app with AWS integration and basic AI functionality
- Host the application on AWS using services such as EC2 for hosting, S3 for storing geospatial data, RDS for relational database needs. 
- Implement AWS lambda functions to handle geospatial data processing tasks (Data conversion or filtering)
- Included a simple AI component that provides a basic analysis or prediction based on the uploaded geospatial data.
---------------------
**Discussion**

I do not have aws credentials and account setup to write code and test it on an aws system. So I have made a GIS based web application and hosted it on github pages. Brief description about it is provided below. 

**GIS Based web application**
I have created a simple web mapping application  using ArcGIS Maps SDK for JavaScript, and hosted it on github pages at https://program-github-angular.github.io/ . Corresponding code can be viewed on github. This application demonstrates typical web mapping functionality such as displaying geo spatial data layers, showing their attribute table, creating selections on the map or in the table, displaying a pop up etc.   I have provided some links that can be pulled up to see open data hosted on AWS. This kind of data can be added to the web application when available as an image service. I looked at Potree converter and viewer. I have added ability to load a local shapefile zip and displaying it on the map. Perhaps, similarly LAS files can be uploaded and then using server side code can be converted using Potree converter. 

**AI component that provides a basic analysis or prediction**
Normally in ESRI ecosystem, in my prior work I have developed analysis code in the form of geoprocessing services written in Python. These are executed on ArcGIS server, after a dataset or an area of interest polygon is provided by user through a client side web mapping application. In such geoprocessing services, I have written code for buffering, connecting to databases and performing complex queries and displaying vector or tabular results. When the analysis times were long, we just shared the results of the analysis with the user at a different time in a shared data store. Here in my web application, as I did not have access to an ArcGIS server, it was not possible to do so. As to exploring options with open source servers,  such as Opengeo's map server etc, I did not try it, thinking that I would not have enough time to implement a geoprocessing solution, although I am aware that it can be done. 

I have done a project in a Data Science 1 class I took in 2023, it looked at predicting incidence of diabetes using National Health Interview Survey data. Its readme describes this project and is available to look at https://github.com/program-github-angular/DS2-classwork/tree/master

Actual notebook is present in that repository at https://github.com/program-github-angular/DS2-classwork/blob/master/projectWorkV1.ipynb

This project does not have geospatial component, but I mention it here to show that I am familiar with data science concepts.

**AWS Lambda function integration related notes**
I looked for examples and found an example of processing satellite imagery on aws compute blog. This code is available in a github repo and a blog article explains it. This is a good starting point for image processing on AWS I feel. If possible, I would have taken a couple of sample images, and run the included code to see its execution and understand possible difficulties. I have also listed a couple of other examples at the end. 

**Processing satellite imagery with serverless architecture** 
**by James Beswick | on 07 APR 2021** 
https://aws.amazon.com/blogs/compute/processing-satellite-imagery-with-serverless-architecture/

AWS Lambda **lets you run code without provisioning or managing servers**. You pay only for the compute time you consume - there is no charge when your code is not running. With Lambda, you can run code for virtually any type of application or backend service - all with zero administration.

"The main use case of this framework is **to prepare imagery for inference pipelines**. I include a reference implementation that uses [Amazon Rekognition](https://aws.amazon.com/rekognition/) for inference. The output processing functions parse **Amazon Rekognition**’s specific prediction format. "

**The user interacts with some S3 buckets to drop initial imagery into the pipeline, retrieve image chips, and retrieve final prediction output.** There is chipinfo s3 bucket and prediction s3 bucket.



![[chipping1.png]]

**Detection Lambda function**: This is triggered by a new image being put into the imagery S3 bucket. Each new object entry is pushed to Amazon Simple Queue Service (_Amazon SQS_) queue.

**Chipping Lambda function**: This processes larger images into smaller chips. Chips and Chip information are saved into separate s3 buckets.

**Prediction Lambda function**: This detects predictions on the chips and then merges these predictions with the chip’s information contained in the chip information bucket. Then each item is pushed into an SQS queue. 
The example shows an implementation based on **Amazon Rekognition’s** object detection output, but this could easily be modified to parse any other inference output.

**De-chipping Lambda function:** This performs processing on prediction queue, and stores results in an S3 bucket.

**AWS Serverless Application Model (SAM) Template**
AWS Serverless Application Model (AWS SAM) is an open-source framework for building serverless applications using infrastructure as code (IaC). With AWS SAM’s shorthand syntax, developers declare [AWS CloudFormation](https://aws.amazon.com/cloudformation) resources and specialized serverless resources that are transformed to infrastructure during deployment.

You define the AWS resources your serverless application uses in the Resources section of your AWS SAM template. When you define a resource, you identify what the resource is, how it interacts with other resources, and how it can be accessed (that is, the permissions of the resource).

The Resources section of your AWS SAM template can contain a combination of AWS CloudFormation resources and AWS SAM resources. Additionally, you can use AWS SAM's short-hand syntax for the following resources:


**Github repo**
https://github.com/aws-samples/serverless-imagery-processing/tree/main/src

**Extracted code from github for easy reference.**

**Image ingest Lambda function**

import json
import os
import boto3

def lambda_handler(event, context):
    # get duplicate chipper count
    num_chippers = int(os.environ['DUPLICATE_CHIPPERS'])
    
    queue_name = os.environ['OUTPUT_QUEUE']
    
    SQS = boto3.resource('sqs')
    q = SQS.get_queue_by_name(QueueName=queue_name)
        
    # for each record iterate through num_chippers and create an entry for each 
    # future chipper
    
    images_to_chip=[]
    for i in range(num_chippers):
        for record in event['Records']:
            new_record = record.copy()
            new_record['chipperID'] = i
            new_record['numChippers']= num_chippers
            images_to_chip.append(new_record)
            r = q.send_message(MessageBody=json.dumps(new_record))
            print(r)
    
    return images_to_chip


**Image Chipper Lambda function**
import json
import os
from PIL import Image
from io import BytesIO
import boto3

def lambda_handler(event, context):
    #print(event)
    x_stride = int(os.environ['STRIDE_X_DIM'])
    y_stride = int(os.environ['STRIDE_Y_DIM'])
    
    window_x = int(os.environ['WINDOW_X_DIM'])
    window_y = int(os.environ['WINDOW_Y_DIM'])
    
    chip_bucket = os.environ['CHIP_BUCKET']
    chip_info_bucket = os.environ['CHIP_INFO_BUCKET']
      
    #download image
    #this assumes the batch size is 1
    record = json.loads(event['Records'][0]['body'])
    bucket = record['s3']['bucket']['name']
    key = record['s3']['object']['key']
    
    s3 = boto3.client("s3")
       
    img_data = BytesIO()
    s3.download_fileobj(bucket, key, img_data)
    img_data.seek(0)
    
    #load image with pil
    im = Image.open(img_data)
    
    
    #get which chips to write out
    numChippers = record['numChippers']
    chipperID = record['chipperID']
    print('init chipper', numChippers, chipperID, key)
    #get image dims
    width, height = im.size
    print('w,h', width, height)
    image_idx =0
    
    file_id = os.path.splitext(key)[0]
    
    #client = boto3.client('s3')
    chip_records = []
    for x in range(0, width, x_stride): #this does not account for final partial chip
        for y in range(0, height, y_stride):
            if image_idx % numChippers ==chipperID:
                chip_record ={}
                #chip the image
                chip = im.crop((x,y, x+window_x, y+window_y))
                
                #write chip to S3
                chipname = f"{file_id}_{image_idx}.png"
                print(chipperID, 'writing chip', image_idx)
                img_buf = BytesIO()
                chip.save(img_buf, 'PNG')
                s3.put_object(Body=img_buf.getvalue(), Bucket=chip_bucket,Key=chipname )
                
                #write info to s3
                chip_record=record.copy()
                chip_record['chipname']= chipname
                chip_record['chip_bucket']=chip_bucket
                chip_record['x_stride']= x_stride
                chip_record['y_stride']= y_stride
                chip_record['x_window']= window_x
                chip_record['y_window']= window_y
                chip_record['orig_x']= x
                chip_record['orig_y']= y
                chip_infoname = f"{file_id}_{image_idx}.json"
                s3.put_object(Body=json.dumps(chip_record), Bucket=chip_info_bucket,Key=chip_infoname )

            image_idx +=1
    
    print(bucket, key)
    
    return chip_records

**Prediction function**

import json
import os
import boto3
import uuid
def lambda_handler(event, context):
    
    rek = boto3.client('rekognition')
    s3 = boto3.client("s3")
    
    output_bucket = os.environ['CHIP_PREDICTIONS_BUCKET']
    
    responses = []
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        img_info = {
                'S3Object':{
                    'Bucket': bucket,
                    'Name': key
                }}
        print(bucket,key)
        response = rek.detect_labels(
            Image=img_info
            )
            
        #add source image information
        
        response['source_img']= img_info
        
        #write results to s3
        
        responses.append(response)
    
    fn = str(uuid.uuid4())+'.json'
    s3.put_object(Body=json.dumps(responses), Bucket=output_bucket,Key=fn )
        
        
    return responses

**Prediction Detection function**

import json
import os
import boto3
from io import BytesIO
def lambda_handler(event, context):
    queue_name = os.environ['PREDICTION_QUEUE']
    chip_info_bucket = os.environ['CHIP_INFO_BUCKET']
    SQS = boto3.resource('sqs')
    q = SQS.get_queue_by_name(QueueName=queue_name)

    
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        
        #download file 
        s3 = boto3.client("s3")
        file_data = BytesIO()
        s3.download_fileobj(bucket, key, file_data)
        file_data.seek(0)
        
        j = json.load(file_data)
        
        
        
        for pred in j:
            #get chip name so we can find the info file in s3 and merge them
            
            #this is the only mandatory information that must be inserted
            # in the prediction so the flow works
            chip_name = pred['source_img']['S3Object']['Name']
            
            file_data = BytesIO()
            info_file = chip_name[:-4] +'.json'
            print(chip_info_bucket, info_file)
            
            s3.download_fileobj(chip_info_bucket, info_file, file_data)
            file_data.seek(0)
            chip_info = json.load(file_data)
            
            pred['chip_info']= chip_info
            r = q.send_message(MessageBody=json.dumps(pred))
            print(r)    
        #there may be multiple predictions per file
        # this is specific for rekognition output

    return event

**Dechipper function**

import json
import boto3
import os
def lambda_handler(event, context):
    
    s3 = boto3.client("s3")
    outbucket = os.environ['OUTPUT_BUCKET']
    
    #this assumes the batch size is 1
    record = json.loads(event['Records'][0]['body'])
    
    x_offset = record['chip_info']['orig_x']
    y_offset = record['chip_info']['orig_y']
    
    #get window size 
    x_window = record['chip_info']['x_window']
    y_window = record['chip_info']['y_window']
    
    chipname = record['chip_info']['chipname']
    
    out_file_name = os.path.splitext(chipname)[0]+'.json'
    
    #project chip coords back to original image coords
    # this converts to pixel coordinates instead of pct dimensions
    #this will replace the coordinates
    for label in record['Labels']:
        for instance in label['Instances']:
            bbox = instance['BoundingBox']
            width = bbox['Width']
            height = bbox['Height']
            left = bbox['Left']
            top = bbox['Top']
            
            # convert
            left = x_offset + (left * x_window)
            top = y_offset + (top * y_window)
            height = height * x_window
            width = width * y_window
            
            bbox['Width'] = width
            bbox['Height'] = height
            bbox['Left'] = left
            bbox['Top'] = top
            
    
    #write to s3
    s3.put_object(Body=json.dumps(record), Bucket=outbucket,Key=out_file_name )
            
        
    return event


**Some other interesting examples**

**Geospatial generative AI with Amazon Bedrock and Amazon Location Service**

by Jeff DeMuth and Swagata Prateek | on 22 NOV 2023
https://aws.amazon.com/blogs/machine-learning/geospatial-generative-ai-with-amazon-bedrock-and-amazon-location-service/

**Guidance for Scaling Geospatial Data Lakes with Earth on AWS** from Amazon Solutions Library
https://aws.amazon.com/solutions/guidance/scaling-geospatial-data-lakes-with-earth-on-aws/


![Guidance Architecture Diagram for Scaling Geospatial Data Lakes with Earth on AWS](https://d1.awsstatic.com/solutions/guidance/images/architecture-diagrams/scaling-geospatial-data-lakes-with-earth-on-aws.b6db65532f7f869ff4fb0ecd96b9ab8055ca6be0.PNG "Guidance Architecture Diagram for Scaling Geospatial Data Lakes with Earth on AWS")
**Step 1**  
Invoke a data ingestion pipeline based on new scene detection. Subscribe to [Amazon Simple Notification Service](https://aws.amazon.com/sns/) (Amazon SNS) topics for managed datasets with appropriate filters, and configure time-based ingestion rules using [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/).

**Step 2**  
[AWS Lambda](https://aws.amazon.com/lambda/) queries the SpatioTemporal Asset Catalog (STAC) API for respective datasets to get product details. **Lambda** then invokes the data processing pipeline through [AWS Step Functions](https://aws.amazon.com/step-functions/).

**Step 3**  
**Step Functions** orchestrates the processing tasks. Parallel or sequential processing can be configured based on task characteristics and requirements.

**Step 4**  
[Amazon Elastic Container Service](https://aws.amazon.com/ecs/) (Amazon ECS) runs the following containerized tasks:

- Downloads the products from datasets hosted on the [Registry of Open Data on AWS](https://registry.opendata.aws/).
- Processes the tiles (through crop and geomosiac operations) to the area of interest and stores them in an [Amazon Simple Storage Service](https://aws.amazon.com/s3/) (Amazon S3) automated optical inspection (AOI)–processed bucket.
- Builds metadata and stores it in [Amazon DynamoDB](https://aws.amazon.com/dynamodb/).
- Stores vector data in [Amazon Aurora PostgreSQL-Compatible Edition](https://aws.amazon.com/rds/aurora/) with PostGIS extensions.

**Step 5**  
**Step Functions** invokes the next processing task with [Amazon SageMaker](https://aws.amazon.com/sagemaker/). Machine learning (ML) models on **SageMaker** perform cloud removal and band math and store the data in an **Amazon S3** preprocessed bucket .**Step Functions** invokes the next processing task with [Amazon SageMaker](https://aws.amazon.com/sagemaker/). Machine learning (ML) models on **SageMaker** perform cloud removal and band math and store the data in an **Amazon S3** preprocessed bucket.

**Step 6**  
QGIS, a geographic information system (GIS) software, is hosted on [Amazon WorkSpaces](https://aws.amazon.com/workspaces/all-inclusive/). The QGIS workbench is used for visualizing or further processing.



