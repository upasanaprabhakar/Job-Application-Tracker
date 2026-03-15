const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (buffer, filename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                type: 'upload',         
                access_mode: 'public',  
                folder: 'job-tracker/resumes',
                public_id: filename,
                format: 'pdf'
            },
            (error, result) => {
                if(error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

const deleteFromCloudinary = (publicId) => {
    return cloudinary.uploader.destroy(publicId, {resource_type: 'raw'});
};

module.exports= {
    uploadToCloudinary,
    deleteFromCloudinary
};