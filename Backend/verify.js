const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    if(req.method === 'OPTIONS') {
      return next(); 
    }
  
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      console.log('No authorization header');
      return res.status(403).send({ message: 'No token provided' });
    }
  
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('Token is missing after "Bearer"');
      return res.status(403).send({ message: 'No token provided' });
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log('JWT verification failed:', err.message);
        return res.status(401).send({ message: 'Unauthorized' });
      }
    
      console.log('Token verified, user id is:', decoded.id, decoded.username );
      req.userId = decoded.id; 
      next();  
    }); 
  };

  module.exports = verifyToken