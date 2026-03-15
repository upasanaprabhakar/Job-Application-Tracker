const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const checkDuplicate = async (userId, companyName, jobTitle) => {
    const normalizedCompany = companyName.toLowerCase().trim();
    const normalisedTitle = jobTitle.toLowerCase().trim();

    const existingApplication = await prisma.jobApplication.findFirst({
        where:{
            userId,
            companyName:{
                equals: normalizedCompany,
                mode:'insensitive'
            },
            jobTitle:{
                equals: normalisedTitle,
                mode: 'insensitive'
            },
            status:{
                notIn: ['rejected', 'accepted']
            }
        }
    });

    return existingApplication;
};

const findSimilarApplications = async (userId, companyName) => {
    const similar = await prisma.jobApplication.findMany({
        where:{
            userId,
            companyName: {
                contains: normalizedCompany,
                mode: 'insensitive'
            },
            status: {
                notIn: ['rejected', 'accepted']
            }
        },
        select:{
            id: true,
            companyName: true,
            jobTitle: true,
            status: true,
            applicationDate: true
        },
        take: 5
    });

    return similar;
};

module.exports = {
    checkDuplicate,
    findSimilarApplications
}