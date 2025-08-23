// import type * as Bcrypt from 'bcrypt';
import type * as Bcryptjs from 'bcryptjs';
import bcryptjs from 'bcryptjs'; // Directly import bcryptjs

let bcrypt: /*typeof Bcrypt |*/ typeof Bcryptjs;

// Always use bcryptjs as per user's request
bcrypt = bcryptjs;

export default bcrypt;
