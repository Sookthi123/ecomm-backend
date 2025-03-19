const express = require('express');
const app = express();
const {User} = require('./model/User');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const{Product}=require('./model/Product');
const{Cart}=require('./model/Cart');

//middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

//1bLzdlgPPqZ846aq

let MONGODB_URL = "mongodb+srv://isookthi:1bLzdlgPPqZ846aq@cluster0.35lfg.mongodb.net/?retryWrites=true&w=majority"


mongoose.connect(MONGODB_URL)
.then(()=>{
    console.log("DB is connected")
}).catch((err)=>{
    console.log("DB is not connected",err)
})

//task-1 create a route for register user
app.post('/register',async(req,res)=>{
  try{
      let {email,name,password} = req.body;
      if(!email || !name ||!password){
          return res.status(400).json({message:"Some fields are Missing"})
      }
      let isUserAlreadyExist = await User.findOne({email});
      if(isUserAlreadyExist){
          return res.status(400).json({message:"User already has a account"});
      }else{
          //hash the password
          const salt = bcrypt.genSaltSync(10);
          const hashedPassword = bcrypt.hashSync(password,salt);

          //token
          const token = jwt.sign({email},"supersecret",
              {expiresIn:'365d'});

          await User.create({
              name,
              email,
              password:hashedPassword,
              token,
              role:'user'
          })
      return res.status(201).json({message:"User created Successfully"})
      }
  }catch(error){
      console.log(error);
      res.status(500).json({message:"Inernal server Error"})
  }
})


//task-2 create a route for login user
app.post('/login',async(req,res)=>{
  try{
      let {email,password} = req.body;

      if(!email || !password){
          return res.status(400).json({message:"Email and password are required"})
      }
      const user = await User.findOne({email});
      if(!user){
          return res.status(400).json({message:"User is not registered, Please create Account"})
      }
      //check password
      const isPasswordMatched = bcrypt.compareSync(password,user.password);

      if(!isPasswordMatched){
          return res.status(400).json({message:"invalid Password"})
      }

      //successful login
      return res.status(200).json({
          id:user._id,
          name:user.name,
          token: user.token,
          email: user.email,
          role:user.role
      })


  }catch(error){
      console.log(error);
      res.status(500).json({message:"Inernal server Error"})
  }
})

//task-3 -> create route see all the product
app.get('/products',async(req,res)=>{
  try{
      const products = await Product.find();
      res.status(200).json({
          message:"Product found successfully",
          products:products
      })

  }catch(error){
      console.log(error);
      res.status(500).json({message:"Inernal server Error"})
  }
})

//task-4-> create a route to add product
app.post('/add-product',async(req,res)=>{
  try{

      const {name, image, price, description,stock,brand} = req.body;
      const {token} = req.headers;
      const decodedtoken = jwt.verify(token,"supersecret");
      const user = await User.findOne({email:decodedtoken.email});
      const product = await Product.create({
          name,
          description,
          image,
          price, 
          stock,
          brand,
          user:user._id
      })
      return res.status(201).json({
          message:"Product created successfully",
          product:product
      })

  }catch(error){
      console.log(error);
      res.status(500).json({message:"Inernal server Error"})
  }
})


//task5 -> to show the particular product
app.get('/product/:id', async(req,res)=>{
  try{
      const {id} = req.params;
      if(!id){
          res.status(400).json({message:"Product Id not found"});
      }

      const {token} = req.headers;

      const userEmailFromToken = jwt.verify(token,"supersecret");
      if(userEmailFromToken.email){
          const product = await Product.findById(id);

          if(!product){
              res.status(400).json({message:"Product not found"});
          }

          res.status(200).json({message:"success",product});
      }

  }catch(error){
      console.log(error);
      res.status(500).json({message:"Internal server error"});
  }
})

//task-6 update a product
app.patch('/product/edit/:id',async(req,res)=>{
const {id} = req.params;
const {token} = req.headers;
const {name, image, price, stock, brand, description} = req.body.productData;
const decodedtoken = jwt.verify(token, "supersecret");
try{
  if(decodedtoken.email){
      const updatedProduct = await Product.findByIdAndUpdate(id,{
         name,
         description,
         image,
         price,
         brand,
         stock 
      })
      return res.status(200).json({
          message:"product updated successfully",
          product: updatedProduct
      })
  }
}catch(error){
      console.log(error);
      res.status(500).json({message:"Inernal server Error"})
  }
})

//task-7 delete the product
app.delete('/product/delete/:id',async(req,res)=>{
  const {id}  = req.params;
  if(!id){
      return res.status(400).json({message:"Product id not found"});
  }
  try{
      const deletedProduct = await Product.findByIdAndDelete(id);

      if(!deletedProduct){
          return res.status(404).json({message:"Product not found"})
      }

      return res.status(500).json({
          message:"Product deleted succcessfuly",
          product: deletedProduct
      })

  }catch(error){
      console.log(error);
      res.status(500).json({message:"Inernal server Error"})
  }
})

//task-8 -> create route to see all product in cart
app.get('/cart',async(req,res)=>{
  const {token} = req.headers;
  const decodedtoken = jwt.verify(token, "supersecret");
  const user = await User.findOne({email:decodedtoken.email}).populate({
      path:'cart',
      populate:{
          path:'products',
          model:'Product'
      }   
  })
  if(!user){
      return res.status(400).json({message:"User not found"})
  }

  return res.status(200).json({
      message:"user found",
      cart:user.cart
  })
})

//task-9 -> create route to add product in cart
app.post('/cart/add',async(req,res)=>{
  const body = req.body;
  const productArray = body.products;
  let totalPrice = 0;
  try{
      for(const item of productArray){
          const product = await Product.findById(item);

          if(product){
              totalPrice += product.price;
          }
      }

      const {token} = req.headers;
      const decodedtoken = jwt.verify(token, "supersecret");
      const user = await User.findOne({email:decodedtoken.email});

      if(!user){
          res.status(404).json({message:"User not found"});
      }
      let cart;
      if(user.cart){
          cart = await Cart.findById(user.cart).populate("products");
          const existingProductIds = cart.products.map((product)=>{
              product._id.toString()
          })

          productArray.forEach(async(productId)=>{
              if(!existingProductIds.includes(productId)){
                  cart.products.push(productId);

                  const product = await Product.findById(productId);
                  totalPrice += product.price;
              }
          })
          cart.total = totalPrice;
          await cart.save();
      }else{
          cart = new Cart({
            products: productArray,
            total:totalPrice  
          });
          await cart.save();
          user.cart = cart._id;
          await user.save();
      }
      res.status(201).json({message:"cart updated succcesfully",
          cart:cart
      })

  }catch(error){
      console.log(error);
      res.status(500).json({message:"Inernal server Error"})
  }
})

//task-10 ->  create route to delete product in cart
app.delete("/cart/product/delete", async (req, res) => {
  const { productID } = req.body;
  const { token } = req.headers;

  try {
    const decodedToken = jwt.verify(token, "supersecret");
    const user = await User.findOne({ email: decodedToken.email }).populate("cart");

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    const cart = await Cart.findById(user.cart).populate("products");

    if (!cart) {
      return res.status(404).json({ message: "Cart Not Found" });
    }

    const productIndex = cart.products.findIndex(
      (product) => product._id.toString() === productID
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product Not Found in Cart" });
    }

    cart.products.splice(productIndex, 1);
    cart.total = cart.products.reduce(
      (total, product) => total + product.price,
      0
    );

    await cart.save();

    res.status(200).json({
      message: "Product Removed from Cart Successfully",
      cart: cart,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error Removing Product from Cart", error });
  }
});

//  task-9
  app.post('/Cart/add',async(req,res)=>{
    
      const body =req.body;
      const productArray = body.products;
      let totalPrice =0;
      
      try{
      for(const item of productArray){
        const product = await Product.findById(Item)
        if(product){
          totalPrice +=product.price;
        }
      }

      const{token} =req.headers;
      const decodedtoken = jwt.verify(token,"supersecert");
      const user = await User.findOne({email:decodedtoken.email});


      if (!user){
         res.status(404).json({message:"user not found"});
      }

      // checking if user already as a cart

      let cart;
      if(user.cart){
        cart = await Cart.findById(user,cart).populate('products');

        const existingProductsIds = cart.products.map((product)=>{
          product._id.toString()
        })

        productArray.forEach(async(productId)=>{
          if(existingProductsIds.includes(productId))
            {
            cart.products.push(productId);
            const product = await product.findById(productId);
            totalPrice += product.price;
            
          }
        })
        cart.total = totalPrice;
        await cart.save();

      }else{
        cart = new Cart({
          products :productArray,
          total : totalPrice
        })
        await cart.save();
        user.cart = cart._id;
        await user.save();
      }
      res.status(201).json({
        message:"cart updated successfully",
        cart:cart
      })


    }
    catch(error){
      console.log(error);
      return res.status(500).json({Message:"Internal server error"});
  }
  })


  //task-10 delete the product from the cart
app.delete('/cart/product/delete',async(req,res)=>
  {
      
          const{productID}=req.body;
          const{token}=req.headers;
          try{
          const decodedtoken=jwt.verify(token,"supersecret");
          const user=await User.findOne({email:decodedtoken.email}).populate('cart');
          
          id(!user)
          {
              return res.status(404).json({message:"user not found"});
          }
          //retrive the cart using user.cart(cart id is present)
          const cart=await Cart.findById(user.cart).populate('products');
          if(!cart)
          {
              return res.status(404).jdon({message:"cart not found"});
          }
          if(!cart){
            return res.status(404).json({message:"cart not found"});
          }
          const productIndex = cart.products.findIndex((product)=>{
               productID_.toString() === productID;
          })

          if(productIndex === -1){
            return res.status(404).json({
              message:"product not found in  cart"})
            
          }
          // use splice method to remove product from cart
          cart.products.splice(productIndex,1);
          cart.total = cart.products.reduce((total,product)=>
          {
            total + product.price,
            0
          })
        await cart.save();
        res.status(200).json({message:"product related from cart",cart:cart})
        
      }
      catch(error){
          console.log(error);
          return res.status(500).json({Message:"Internal server error"});
      }
  
  })

let PORT = 8080;
app.listen(PORT,()=>{
    console.log(`server is connected to port: ${PORT} `)
})


