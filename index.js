const express = require('express'); // Import the Express framework for building the server
const multer = require('multer'); // Import Multer for handling file uploads
const cors = require('cors'); // Import CORS middleware to allow cross-origin requests
require('dotenv').config();

const { google } = require('googleapis');
const path = require('path');

// Load the service account credentials
//const KEY_FILE_PATH = path.join(__dirname, 'service-account/node-backend-458115-4d45118620d0.json');
const KEY_FILE_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

const fs = require('fs');

async function uploadToGoogleDrive(filePath, fileName) {
    const fileMetadata = {
        name: fileName,
        parents: ['1vtn10FOELTxPBvH_kS4WkwwQ7r91z7b9'], // Replace with your Google Drive folder ID
    };

    const media = {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
    });

    return response.data; // Returns file ID and link
}



const port = process.env.port; // Define the port number for the server

const app = express(); // Create an instance of the Express application

// Configure Multer to save files with their original names
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Set the destination folder for uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Save the file with its original name
    },
});

const upload = multer({ storage }); // Create a Multer instance with the configured storage

app.use(cors()); // Enable CORS to allow requests from different origins

// Define the POST endpoint for file uploads
app.post('/upload', upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files were uploaded.'); // Respond with an error if no files were uploaded
    }

    try {
        const uploadedFiles = [];

        // Upload each file to Google Drive
        for (const file of req.files) {
            const filePath = file.path;
            const fileName = file.filename;

            const driveResponse = await uploadToGoogleDrive(filePath, fileName);

            // Optionally delete the local file after uploading
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error deleting local file:', err);
            });

            uploadedFiles.push({
                originalName: file.originalname,
                driveLink: driveResponse.webViewLink,
            });
        }

        res.status(200).json({
            message: 'Files uploaded successfully!',
            uploadedFiles,
        });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).send('Failed to upload files.');
    }
});

// Start the server and listen on the specified port
app.listen(5000, () => {
    console.log(`Server is running on ${port}`); // Log a message indicating the server is running
});