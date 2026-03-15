const validateApplicationInput = (data) => {
    const errors = [];

    if(!data.companyName || data.companyName.trim() === ''){
        errors.push('Company name is required');
    }

    if(data.companyName && data.companyName.length > 100){
        errors.push('Company name must be less than 100 characters');
    }

    if(!data.jobTitle || data.jobTitle.trim() === ''){
        errors.push('Job title is required');
    }

    if(data.jobTitle && data.jobTitle.length > 100){
        errors.push('Job title must be less than 100 characters');
    }

    if(data.status){
        const validStatuses = ['applied', 'interviewing', 'rejected', 'offer', 'accepted'];
        if(!validStatuses.includes(data.status)){
            errors.push('Invalid status. Must be: applied, interviewing, rejected, offer, or accepted');
        }
    }

    if(data.jobUrl && data.jobUrl.length > 500){
        errors.push('Job URL must be less than 500 characters');
    } 

    if (data.salaryRange && data.salaryRange.length > 50){
        errors.push('Salary range must be less than 50 characters');
    }

    if(data.location && data.location.length> 100){
        errors.push('Location must be less than 100 characters');
    }

    if(data.applicationDate){
        const date = new Date(data.applicationDate);
        if(isNaN(date.getTime())){
            errors.push('Invalid application date format');
        }

        if(date > new Date()){
            errors.push('Application date cannot be in the future');
        }
    }

    if(data.followUpDate){
        const date = new Date(data.followUpDate);
        if(isNaN(date.getTime())){
            errors.push('Invalid follow-up date format');
        }
    }

    return {
        isValid : errors.length === 0,
        errors
    };
};

const sanitizeInput = (data) => {
    const sanitized = {};

    if(data.companyName) sanitized.companyName = data.companyName.trim();
    if (data.jobTitle) sanitized.jobTitle = data.jobTitle.trim();
    if (data.jobDescription) sanitized.jobDescription = data.jobDescription.trim();
    if (data.jobUrl) sanitized.jobUrl = data.jobUrl.trim();
    if (data.status) sanitized.status = data.status.toLowerCase().trim();
    if (data.salaryRange) sanitized.salaryRange = data.salaryRange.trim();
    if (data.location) sanitized.location = data.location.trim();
    if (data.notes) sanitized.notes = data.notes.trim();
    if (data.applicationDate) sanitized.applicationDate = new Date(data.applicationDate);
    if (data.followUpDate) sanitized.followUpDate = new Date(data.followUpDate);

    return sanitized;
};

module.exports = {
    validateApplicationInput,
    sanitizeInput
};