// Import required modules
const express = require('express');
const multer = require('multer');
const path = require('path');

// Create a new Express app
const app = express();
const port = 3000;

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    console.log("destination:", './uploads/');
    cb(null, 'C:/Users/alber/Documents/public_html/Protected/uploads/')  // <-- this should match the directory where you want to store uploaded files
  },
  filename: function(req, file, cb) {
    console.log("filename:", file.originalname);
    cb(null, file.originalname)  // <-- this is the filename to use for the uploaded file
  }
});

// Create a new Multer instance with the configured storage
const upload = multer({ storage: storage });

// Serve static files from the 'Public' directory
app.use(express.static('Public'));

// Route for handling file uploads
app.post('/Protected/uploads', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No files were uploaded.');
  }
  res.send(req.file.filename);
});


// Route for downloading files
app.get('/Protected/uploads/:filename', function(req, res){
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '/uploads/', filename);
  res.sendFile(filePath);
});

// Route for serving your index.html file
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// Start the Express server
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
});
