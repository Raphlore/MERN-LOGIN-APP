import UserModel from "../model/User.model.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import ENV from '../config.js'
import otpgenerator from 'otp-generator'

/** middleware for verify user */
export async function verifyUser(req, res, next){
  try {
    const { username } = req.method == 'GET' ? req.query : req.body;

    //Check the user existence
    let exist = await UserModel.findOne({ username })
    if(!exist) return res.status(404).send({ error : 'Cant find User'})
      next();

  } catch (error) {
    return res.status(404).send({ error: 'Authentication Error'})
  }
}

/** POST: http://localhost:8080/api/register 
* @param : {
  'username' : 'example123',
  'password' : 'admin123',
  'email' : 'example@gmail.com',
  'firstname' : 'bill',
  'lastname' : 'william',
  'mobile' : 9087352187,
  'address' : 'Apt, 406 Kola Light, Queensstreet',
  'profile' : ''
}
*/
export async function register(req, res) {
  try {
    const { username, password, profile, email } = req.body;

    // Check for existing username
    const existingUsername = await UserModel.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check for existing email
    const existingEmail = await UserModel.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance
    const newUser = new UserModel({
      username,
      password: hashedPassword,
      profile: profile || '',
      email
    });

    // Save the user to the database
    await newUser.save();

    // Send success response
    return res.status(201).json({ msg: 'User registered successfully' });
  } catch (error) {
    console.error('Error in registration:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** POST: http://localhost:8080/api/login 
 * @param: {
  'username' : 'example123',
  'password' : 'admin123'
  }
  */

export async function login(req, res){
  const { username, password } = req.body;

  try {
    UserModel.findOne({ username })
    .then(user => {
      bcrypt.compare(password, user.password)
      .then(passwordCheck => {
        if(!passwordCheck) return res.status(400).send({ error: 'Dont have Password'})

          // Create jwt token
          const token = jwt.sign({
            userid: user._id,
            username : user.username
          }, ENV.JWT_SECRET, { expiresIn : '24h'})

          return res.status(200).send({
            msg: 'Login Successfully...!',
            username: user.username,
            token
          })
      })
      .catch(error => {
        return res.status(400).send({ error: 'Password does not match'})
      })
    })
    .catch (error => {
      return res.status(404).send({ error : 'Username not found'})
    })
  } catch (error) {
    return res.status(500).send({ error })
  }
}

/** GET: http://localhost:8080/api/user/example123 */
export async function getUser(req, res) {
  const { username } = req.params;

  console.log('Username:', username); // Add this line for debugging

  try {
    if (!username) return res.status(400).send({ error: 'Invalid Username' });

    const user = await UserModel.findOne({ username });

    console.log('User:', user); // Add this line for debugging

    if (!user) return res.status(404).send({ error: 'User not found' });

    /** remove password from user */
    // Mongoose return unnecessary data with object so convert it into json
    const { password, ...rest } = Object.assign({}, user.toJSON())

    return res.status(200).send(rest);
  } catch (error) {
    console.error('Error retrieving user:', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
}

/** PUT: http://localhost:8080/api/updateuser
 * @param: {
  'id' : '<userid>'
 }
 body: {
  firstname: '',
  address: '',
  profile: ''
 }
 */
 export async function updateUser(req, res) {
  try {
    const { userid } = req.user;

    if (!userid) {
      return res.status(404).send({ error: 'Invalid User ID' });
    }

    const body = req.body;

    // Update the data
    const result = await UserModel.updateOne({ _id: userid }, body);

    if (result.nModified === 0) {
      return res.status(404).send({ error: 'User not found or data unchanged' });
    }

    return res.status(200).send({ msg: 'Record Updated' });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
}

/** get: http://localhost:8080/api/generateOTP */
export async function generateOTP(req, res){
  req.app.locals.OTP = otpgenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false})
  res.status(201).send({ code: req.app.locals.OTP })
}


/** GET: http://localhost:8080/api/verifyOTP */
export async function verifyOTP(req, res){
  const { code } = req.query;
  if(parseInt(req.app.locals.OTP) === parseInt(code)){
    req.app.locals.OTP = null; // reset the OTP value
    req.app.locals.resetSession = true; // start session for reset password
    return res.status(201).send({ msg: 'Verify Successfully!'})
  }
  return res.status(400).send({ error: 'Invalid OTP'})
}

// Successfully redirect user when OTP is valid
/** GET: http://localhost:8080/api/createResetSession */
export async function createResetSession(req, res){
  if(req.app.locals.resetSession){
    return res.status(201).send({ flag : req.app.locals.resetSession})
  }
  return res.status(440).send({error: 'Session expired!'})
}

/** PUT: http://localhost:8080/api/resetPassword */
export async function resetPassword(req, res) {
  try {
    const { username, password } = req.body;

    // Find the user by username
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).send({ error: 'Username not found' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    const result = await UserModel.updateOne(
      { username: user.username },
      { password: hashedPassword }
    );

    // Check if the update was successful
    if (result.nModified === 0) {
      return res.status(500).send({ error: 'Failed to update password' });
    }

    // Reset the session and send a success response
    req.app.locals.resetSession = false; // Reset session
    return res.status(201).send({ msg: 'Record Updated!' });

  } catch (error) {
    return res.status(500).send({ error: 'An error occurred while resetting password' });
  }
}