// this file will be used to return the header for all the html pages

function getHTMLHeader() {
    return `
      <!--START OF HEADER --> 
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src *; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link href="../../libs/css/bootstrap.min.css" rel="stylesheet">
          <link href="../css/styles.css" rel="stylesheet">
          <link href="../../node_modules/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet">
          <title>passwordPlease</title>
            <style>
                .list-circle {
                    list-style-type: circle;
                    padding-left: 20px;
                }
            </style>
        </head>
        <body>
        <!--END OF HEADER --> 
    `;
  }
  
  module.exports = { getHTMLHeader };
  