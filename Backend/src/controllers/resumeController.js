const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
const {uploadToCloudinary, deleteFromCloudinary} = require('../config/cloudinary');
const {extractTextFromPDF} = require('../utils/pdfExtractor');


const uploadResume = async(req, res) => {
    try{
        const userId = req.user.id;
        const {title} = req.body;

        if(!req.file){
            return res.status(400).json({
                error: 'Resume file is required'
            });
        }
        if(!title){
            return res.status(400).json({
                error: 'Resume title is required'
            });
        }

        const filename = `${userId}_${Date.now()}_${req.file.originalname}`;
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer, filename);

        const contentText = await extractTextFromPDF(req.file.buffer);

        const resume = await prisma.resume.create({
            data:{
                userId,
                title,
                fileUrl: cloudinaryResult.secure_url,
                contentText,
                fileSize: req.file.size,
                fileName: req.file.originalname
            }
        });

        res.status(201).json({
            message: 'Resume uploaded successfully',
            resume,
            textExtracted: !!contentText
        });
    }
    catch(error){
        console.error('Upload resume error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
};

const getAllResumes = async(req, res) => {
    try{
        const userId = req.user.id;

        const resumes = await prisma.resume.findMany({
            where: {userId},
            orderBy: {createdAt: 'desc'},
            select: {
                id: true,
                title: true,
                fileUrl: true,
                fileName: true,
                fileSize: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {applications: true}
                }
            }
        });

        res.json({
            count: resumes.length,
            resumes
        });
    }
    catch(error){
        console.error('Get resumes error:', error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};

const getResumeById = async(req, res) => {
    try{
        const userId = req.user.id;
        const {id} = req.params;

        const resume = await prisma.resume.findUnique({
            where: {id},
            include: {
                applications:{
                    select:{
                        id: true,
                        companyName: true,
                        jobTitle: true,
                        status: true,
                        applicationDate: true
                    }
                }
            }
        });

        if(!resume){
            return res.status(404).json({
                error: 'Resume not found'
            });
        }

        if(resume.userId !== userId){
            return res.status(403).json({
                error: 'Forbidden'
            });
        }

        res.json({resume});
    }
    catch(error){
        console.error('Get resume error:', error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};

const updateResume = async(req, res) => {
    try{
        const userId = req.user.id;
        const {id} = req.params;
        const {title} = req.body;

        if(!title){
            return res.status(400).json({
                error: 'Resume title is required'
            });
        }

        const resume = await prisma.resume.findUnique({
            where: {id}
        });

        if(!resume){
            return res.status(404).json({
                error: 'Resume not found'
            });
        }

        if(resume.userId !== userId){
            return res.status(403).json({
                error: 'Forbidden'
            });
        }

        const updatedResume = await prisma.resume.update({
            where: {id},
            data: {title}
        });

        res.json({
            message: 'Resume updated successfully',
            resume: updatedResume
        });
    }
    catch(error){
        console.error('Update resume error:', error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};

const deleteResume = async (req, res) => {
    try{
        const userId = req.user.id;
        const {id} = req.params;

        const resume = await prisma.resume.findUnique({
            where: {id}
        });

        if(!resume){
            return res.status(404).json({
                error: 'Resume not found'
            });
        }

        if(resume.userId !== userId){
            return res.status(403).json({
                error: 'Forbidden'
            });
        }

        const publicId = resume.fileUrl.split('/').slice(-2).join('/').split('.')[0];
        try{
            await deleteFromCloudinary(publicId);
        }
        catch(error){
            console.error('Cloudinary deletion failed:', error);
        }

        await prisma.resume.delete({
            where: {id}
        });

        res.json({
            message: 'Resume deleted successfully'
        });
    }
    catch(error){
        console.error('Delete resume error:', error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};

const getResumeText = async(req, res) => {
    try{
        const userId = req.user.id;
        const {id} = req.params;

        const resume = await prisma.resume.findUnique({
            where: {id},
            select: {
                id: true,
                userId: true,
                title: true,
                contentText: true
            }
        });

        if(!resume){
            return res.status(404).json({
                error: 'Resume not found'
            });
        }

        if(resume.userId !== userId){
            return res.status(403).json({
                error: 'Forbidden'
            });
        }

        if(!resume.contentText){
            return res.status(404).json({
                error: 'No text content available for this resume'
            });
        }

        res.json({
            id: resume.id,
            title: resume.title,
            contentText: resume.contentText
        });
    }
    catch(error){
        console.error('Get resume text error:', error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};

module.exports = {
    uploadResume,
    getAllResumes,
    getResumeById,
    updateResume,
    deleteResume,
    getResumeText
};