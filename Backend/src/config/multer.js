const multer= require('multer');

const storage= multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf'];

    if(allowedTypes.includes(file.mimetype)){
        cb(null, true);
    }
    else{
        cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = upload;