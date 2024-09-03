require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GeoJSONLayer",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Sketch/SketchViewModel",       
  "esri/Graphic",
  "esri/Color",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/TextSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/Font",
  "esri/geometry/support/webMercatorUtils",
  "esri/geometry/SpatialReference",
  "esri/geometry/projection",
  "esri/geometry/coordinateFormatter",
  "esri/geometry/Extent",
  "esri/smartMapping/renderers/type",
  "esri/widgets/Legend",
  "esri/widgets/Popup",
  "esri/widgets/FeatureTable",
  "esri/widgets/BasemapGallery",
  "esri/widgets/LayerList",
  "esri/widgets/CoordinateConversion",
  "esri/widgets/Measurement",
  "esri/widgets/ScaleBar",
  "esri/widgets/Fullscreen",
  "esri/geometry/geometryEngineAsync",
  "esri/widgets/Expand",
  "esri/core/reactiveUtils", 
 
], (Map, MapView, FeatureLayer, GeoJSONLayer, GraphicsLayer, SketchViewModel,
  Graphic, Color, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, TextSymbol, PictureMarkerSymbol, Font,
  webMercatorUtils, SpatialReference, projection, coordinateFormatter, Extent,
  typeRendererCreator, Legend, Popup, FeatureTable, BasemapGallery, LayerList, 
  CoordinateConversion, Measurement, ScaleBar, Fullscreen, geometryEngineAsync,
  Expand, reactiveUtils) => {
  
   var croplayerView;  
  // Create a map and add it to a MapView

  const map = new Map({
    basemap: "gray-vector"
  });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-100, 39],
    zoom: 3
  });

  // Add a legend to the view

  const legend = new Legend({
    view: view,
    style: "card"
  });
  view.ui.add(legend, "bottom-left");

  const bg = new BasemapGallery({
    view: view,
    container: document.createElement("div")
  });

  const scaleBar = new ScaleBar({
    view: view,
    unit: "dual" // The scale bar displays both metric and imperial units.
  });

  // Add the widget to the bottom left corner of the view
  view.ui.add(scaleBar, {
    position: "bottom-right"
  });

  // Call generateRenderer() anytime the user switches the basemap

  bg.watch("activeBasemap", generateRenderer);

  // Collapse the basemap gallery widget in the expand widget

  const expand = new Expand({
    view: view,
    content: bg
  });
  view.ui.add(expand, "top-right");

  const layerList = new LayerList({
    view: view,
    container: "divLayerlist", 
    // executes for each ListItem in the LayerList
    listItemCreatedFunction: async function (event) {

      // The event object contains properties of the
      // layer in the LayerList widget.

      let item = event.item;

      // Wait for the layer to load and the item title to become available
      await item.layer.when();

      if (item.title === "Sketch Polygon") {
        // open the list item in the LayerList
        event.item.hidden = true;
        
      }
    }

  });

  const ccWidget = new CoordinateConversion({
    view: view,
    container: "divCoord"
  });

  // Set the activeView to the 2D MapView
  let activeView = view;

  // Create new instance of the Measurement widget
  const measurement = new Measurement(
    {
      view:view,
      container: "divMeasure"
    }
  );

  const distanceButton = document.getElementById('distance');
  const areaButton = document.getElementById('area');
  const clearButton = document.getElementById('clear');

  distanceButton.addEventListener("click", () => {
    distanceMeasurement();
  });
  areaButton.addEventListener("click", () => {
    areaMeasurement();
  });
  clearButton.addEventListener("click", () => {
    clearMeasurements();
  });

  // Call the appropriate DistanceMeasurement2D or DirectLineMeasurement3D
  function distanceMeasurement() {
    // const type = activeView.type;
    measurement.activeTool =  "distance" ;
    distanceButton.classList.add("active");
    areaButton.classList.remove("active");
  }
  // Call the appropriate AreaMeasurement2D or AreaMeasurement3D
  function areaMeasurement() {
    measurement.activeTool = "area";
    distanceButton.classList.remove("active");
    areaButton.classList.add("active");
  }
  // Clears all measurements
  function clearMeasurements() {
    distanceButton.classList.remove("active");
    areaButton.classList.remove("active");
    measurement.clear();
  }
  // Create FeatureLayer instance with popupTemplate

  const fieldInfos = [
    {
      fieldName: "M172_07",
      label: "Wheat",
      format: {
        digitSeparator: true,
        places: 0
      }
    },
    {
      fieldName: "M188_07",
      label: "Cotton",
      format: {
        digitSeparator: true,
        places: 0
      }
    },
    {
      fieldName: "M193_07",
      label: "Soybeans",
      format: {
        digitSeparator: true,
        places: 0
      }
    },
    {
      fieldName: "M217_07",
      label: "Vegetables",
      format: {
        digitSeparator: true,
        places: 0
      }
    },
    {
      fieldName: "M163_07",
      label: "Corn",
      format: {
        digitSeparator: true,
        places: 0
      }
    }
  ];

  const croplayer = new FeatureLayer({
    url:
      "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/US_county_crops_2007_clean/FeatureServer/0",
    outFields: [
      "M172_07",
      "M188_07",
      "M193_07",
      "M217_07",
      "M163_07",
      "TOT_CROP_ACRES",
      "DOM_CROP_ACRES",
      "COUNTY",
      "STATE"
    ],
    title: "U.S. Counties - Crop Harvest",
    popupTemplate: {
      // autocasts as new PopupTemplate()
      title: "{COUNTY}, {STATE}",
      content: [
        {
          type: "text",
          text:
            "{TOT_CROP_ACRES} acres of crops were harvested in {COUNTY}, {STATE}" +
            " in 2007. The table below breaks down the number of acres that were" +
            " harvested for each type of crop."
        },
        {
          type: "fields",
          fieldInfos: fieldInfos
        }
      ],
      fieldInfos: [
        {
          fieldName: "TOT_CROP_ACRES",
          label: "Total harvest acres of crops",
          format: {
            digitSeparator: true,
            places: 0
          }
        }
      ]
    }
  });

  function errorCallback(error) {
      console.log("error happened:", error.message);
  }


  // Generate the renderer when the view becomes ready
  reactiveUtils.whenOnce(() => !view.updating).then(() => {
    generateRenderer();
  });

  const featureTable = new FeatureTable({
    view: view,
    layer:   croplayer,
    container: "divLayerTable",
    returnGeometryEnabled: true
   });

  // Check if the highlights are being changed on the table
  // update the features array to match the table highlights
  let features = [];
  featureTable.highlightIds.on("change", async (event) => {
    // this array will keep track of selected feature objectIds to
    // sync the layerview feature effects and feature table selection
    // set excluded effect on the features that are not selected in the table
    event.removed.forEach((item) => {
      const data = features.find((data) => {
        return data === item;
      });
      if (data) {
        features.splice(features.indexOf(data), 1);
      }
    });

    // If the selection is added, push all added selections to array
    event.added.forEach((item) => {
      features.push(item);
    });
    console.log(features);
    croplayerView.featureEffect = {
      filter: {
        objectIds: features
      },
      // includedEffect: "drop-shadow(1px, 1px, 1px, black)",
      // excludedEffect: "blur(2px) grayscale(60%) opacity(40%)"
      excludedEffect: "opacity(20%)"
    };
  });


  // polygonGraphicsLayer will be used by the sketchviewmodel
  // show the polygon being drawn on the view
  const polygonGraphicsLayer = new GraphicsLayer({title:"Sketch Polygon"});
  map.add(polygonGraphicsLayer);

  // add the select by rectangle button the view
  view.ui.add("select-by-rectangle", "top-left");
  const selectButton = document.getElementById("select-by-rectangle");


  // click event for the select by rectangle button
  selectButton.addEventListener("click", () => {
    view.closePopup();
    sketchViewModel.create("rectangle");
  });


  // add the clear selection button the view
  view.ui.add("clear-selection", "top-left");
  document.getElementById("clear-selection").addEventListener("click", () => {
    featureTable.highlightIds.removeAll();
    featureTable.filterGeometry = null;
    polygonGraphicsLayer.removeAll();
  });

  // create a new sketch view model set its layer
  const sketchViewModel = new SketchViewModel({
    view: view,
    layer: polygonGraphicsLayer
  });


  // Once user is done drawing a rectangle on the map
  // use the rectangle to select features on the map and table
  sketchViewModel.on("create", async (event) => {
    if (event.state === "complete") {
      // this polygon will be used to query features that intersect it
      const geometries = polygonGraphicsLayer.graphics.map(function (graphic) {
        return graphic.geometry;
      });
      const queryGeometry = await geometryEngineAsync.union(geometries.toArray());
      selectFeatures(queryGeometry);
    }
  });

  // This function is called when user completes drawing a rectangle
  // on the map. Use the rectangle to select features in the layer and table
  function selectFeatures(geometry) {
    if (croplayerView) {
      // create a query and set its geometry parameter to the
      // rectangle that was drawn on the view
      const query = {
        geometry: geometry,
        outFields: ["*"]
      };

      // query graphics from the csv layer view. Geometry set for the query
      // can be polygon for point features and only intersecting geometries are returned
      croplayerView
        .queryFeatures(query)
        .then((results) => {
          if (results.features.length === 0) {
            clearSelection();
          } else {
            featureTable.highlightIds.removeAll();
            let highlightIds = [];
            // filter the table based on the selection and only show those rows
            featureTable.filterGeometry = geometry;
            // Iterate through the features and push each individual result's OBJECTID to the highlightIds array
            results.features.forEach((feature) => {
              // console.log(feature.attributes);
              highlightIds.push(feature.attributes.OBJECTID); // for this layer works
            });
            
            // Set the highlightIds array to the highlightIds property of the featureTable
            featureTable.highlightIds.addMany(highlightIds);
          }
        })
        .catch(errorCallback);
    }
  }
  
  function generateRenderer() {
    // configure parameters for the color renderer generator.
    // The layer must be specified along with a field name
    // The view and other properties determine
    // the appropriate default color scheme.

    const typeParams = {
      layer: croplayer,
      view: view,
      field: "DOM_CROP_ACRES",
      legendOptions: {
        title: "Dominant crop in harvested acres by county (2007)"
      }
    };

    // Generate a unique value renderer based on the
    // unique values of the DOM_CROPS_ACRES field.
    // The generated renderer creates a visualization,
    // assigning each feature to a category.
    //
    // This resolves to an object containing several helpful
    // properties, including the type scheme, unique value infos,
    // excluded values (if any), and the renderer object

    typeRendererCreator
      .createRenderer(typeParams)
      .then(async (response) => {
        // set the renderer to the layer and add it to the map

        croplayer.renderer = response.renderer;

        if(!map.layers.includes(croplayer)){
          map.add(croplayer);

          croplayer
            .when(() => {
              // console.log("Crop layer when done");
              view.whenLayerView(croplayer).then(function (layerView) {
                croplayerView = layerView;
              });
            })
            .catch(errorCallback);
        }
      })
      .catch((error) => {
        console.error("there was an error: ", error);
      });
  }
  

  var addShapeToGraphicLayer = function addShape1 (lstFeats, layerName){
    
    // console.log(lstFeats);
    // create a new blob from geojson featurecollection
      const blob = new Blob([JSON.stringify(lstFeats)], {
      type: "application/json"
    });

    // URL reference to the blob
    const url = URL.createObjectURL(blob);
    // create new geojson layer using the blob url
    const geojsonShapelayer = new GeoJSONLayer({
      url: url,
      title: layerName
    });
    map.add(geojsonShapelayer);
  }

  const fullscreen = new Fullscreen({
    view: view
  });
  view.ui.add(fullscreen, "top-right");

  // Code to change esri theme acc to page, but some widgets do not respond correctly
  // var syncThemeWithEsriCss = function applyEsriStyle (selTheme){
  //   var lightEsriTheme = "https://js.arcgis.com/4.30/esri/themes/light/main.css";
    
  //   var darkEsriTheme =    "https://js.arcgis.com/4.30/esri/themes/dark/main.css";
    
  //   if (theme !== "dark")   {
  //     document.getElementById('esriStyleLink').setAttribute('href', lightEsriTheme); ;
      
  //   } else if (theme === "dark") {
  //     document.getElementById('esriStyleLink').setAttribute('href', darkEsriTheme);          
  //   }
  //  }

  // var theme, selTheme;
  // document.querySelectorAll('[data-bs-theme-value]')
  //   .forEach(toggle => {
  //     theme = toggle.getAttribute('data-bs-theme-value')
  //     if ((toggle.getAttribute('aria-pressed'))==="true"){
  //       console.log(theme);
  //       syncThemeWithEsriCss(theme);
  //     }
        
  //     toggle.addEventListener('click', () => {
  //       const theme = toggle.getAttribute('data-bs-theme-value')
  //       console.log(theme);
  //       syncThemeWithEsriCss(theme);
  //     })
  //   });

      
  
   // jQuery code to make button work 
      
  $(document).ready(function(){
    // console.log("can work with jquery");
    
    var $result = $("#result");
    // code to add shapefile and check contents
    $("#shapeinput").on("change", async function(evt) {
      // remove content
      $result.html("");
      // be sure to show the results
      $("#resultBlock").removeClass("hidden").addClass("show");

      // Closure to capture the file information.
      function handleFile(f) {
          var $title = $("<p>", {
            "class": "small",
              text : f.name
          });
          var $fileContent = $("<ul>");
          $result.append($title);
          $result.append($fileContent);

          var dateBefore = new Date();
          JSZip.loadAsync(f)                                   // 1) read the Blob
              .then(function(zip) {
                  var dateAfter = new Date();
                  $title.append($("<span>", {
                      "class": "small",
                      text:" (loaded in " + (dateAfter - dateBefore) + "ms)"
                  }));
                  
                  console.log(zip);
                  
                  zip.forEach(function (relativePath, zipEntry) {  // 2) print entries
                      $fileContent.append($("<li>", {
                        "class": "small",
                          text : zipEntry.name
                      }));
                  });
              }, function (e) {
                  $result.append($("<div>", {
                      "class" : "alert alert-danger",
                      text : "Error reading " + f.name + ": " + e.message
                  }));
              });
      }

      var files = evt.target.files;
      if (files.length > 0){
        var selInputFile = files[0];
        handleFile(files[0]);
        // in browser from some sort of file upload
        const data = await selInputFile.arrayBuffer()
        const geojson = await shp(data);
        console.log(geojson);
        var zipFileName = files[0].name.slice(0,-4);
        console.log(zipFileName);
        addShapeToGraphicLayer(geojson, zipFileName );

      }

      // for (var i = 0; i < files.length; i++) {
        
      //     handleFile(files[i]);
          
      // }

    });

  });
        
});
