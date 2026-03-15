const errorHandler = (err, req, res, next) =>{
    console.error('Error:', err);

    if(err.name === 'PrismaClientKnownRequestError'){
        if(err.code === 'P2002'){
            return res.status(400).json({
                error: 'Duplicate entry',
                field: err.meta?.target
            });
        }

        if(err.code === 'P2025'){
            return res.status(404).json({
                error: 'Record not found'
            });
        }
    }

    if(err.name === 'PrismaClientValidationError'){
        return res.status(400).json({
            error: 'Invalid data provided'
        });
    }

    res.status(500).json({
        error: 'Internal Server Error'
    });
};

module.exports = errorHandler;

