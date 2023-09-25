const httpStatus = require("http-status");
const { Cart, Product } = require("../models");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");
const mongoose = require("mongoose");
// TODO: CRIO_TASK_MODULE_CART - Implement the Cart service methods

/**
 * Fetches cart for a user
 * - Fetch user's cart from Mongo
 * - If cart doesn't exist, throw ApiError
 * --- status code  - 404 NOT FOUND
 * --- message - "User does not have a cart"
 *
 * @param {User} user
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const getCartByUser = async (user) => {
  const cart = await Cart.findOne({ email: user.email });
  if (cart == null) {
    throw new ApiError(httpStatus.NOT_FOUND, "User does not have a cart");
  }
  return cart;
};

/**
 * Adds a new product to cart
 * - Get user's cart object using "Cart" model's findOne() method
 * --- If it doesn't exist, create one
 * --- If cart creation fails, throw ApiError with "500 Internal Server Error" status code
 *
 * - If product to add already in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product already in cart. Use the cart sidebar to update or remove product from cart"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - Otherwise, add product to user's cart
 *
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const addProductToCart = async (user, productId, quantity) => {
  let cart = await Cart.findOne({ email: user.email });
  if (!cart) {
    try {
      cart = await Cart.create({
        email: user.email,
        cartItems: new Array(),
        paymentOption: config.default_payment_option,
      });
      // await cart.save();
    } catch (error) {
      // if cart creation fails throw internal error, status 500
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "User cart Creation failed."
      );
    }
  }

  const isProductAlreadyPresent =
    !cart || !cart.cartItems
      ? false
      : cart.cartItems.some((cartItem) => {
          const id1 = mongoose.Types.ObjectId(cartItem.product._id);
          const id2 = mongoose.Types.ObjectId(productId);
          return id1.equals(id2);
        });

  if (isProductAlreadyPresent) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Product already in cart. Use the cart sidebar to update or remove product from cart"
    );
  }

  const productInDB = await Product.findById(productId);

  if (!productInDB) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Product doesn't exist in database"
    );
  }

  if (!cart || !cart.cartItems) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR);
  }

  cart.cartItems.push({
    product: productInDB,
    quantity,
  });

  await cart.save();
  return cart;
};

/**
 * Updates the quantity of an already existing product in cart
 * - Get user's cart object using "Cart" model's findOne() method
 * - If cart doesn't exist, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart. Use POST to create cart and add a product"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * - Otherwise, update the product's quantity in user's cart to the new quantity provided and return the cart object
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const updateProductInCart = async (user, productId, quantity) => {
  let cart = await Cart.findOne({ email: user.email });
  if (cart == null) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User does not have a cart. Use POST to create cart and add a product"
    );
  }

  const productInDB = await Product.findById(productId);

  if (!productInDB) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Product doesn't exist in database"
    );
  }

  const productIndex =
    !cart || !cart.cartItems
      ? -1
      : cart.cartItems.findIndex((cartItem) => {
          const id1 = mongoose.Types.ObjectId(cartItem.product._id);
          const id2 = mongoose.Types.ObjectId(productId);
          return id1.equals(id2);
        });

  if (productIndex === -1) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart");
  }

  cart.cartItems[productIndex].quantity = quantity;
  await cart.save();
  return cart;
};

/**
 * Deletes an already existing product in cart
 * - If cart doesn't exist for user, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * Otherwise, remove the product from user's cart
 *
 *
 * @param {User} user
 * @param {string} productId
 * @throws {ApiError}
 */
const deleteProductFromCart = async (user, productId) => {
  let cart = await Cart.findOne({ email: user.email });
  if (!cart) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not have a cart");
  }

  const productIndex =
    !cart || !cart.cartItems
      ? -1
      : cart.cartItems.findIndex((cartItem) => {
          const id1 = mongoose.Types.ObjectId(cartItem.product._id);
          const id2 = mongoose.Types.ObjectId(productId);
          return id1.equals(id2);
        });

  if (productIndex === -1) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart");
  }

  cart.cartItems =
    !cart || !cart.cartItems
      ? []
      : cart.cartItems.filter((cartItem) => {
          const id1 = mongoose.Types.ObjectId(cartItem.product._id);
          const id2 = mongoose.Types.ObjectId(productId);
          return !id1.equals(id2);
        });

  await cart.save();
};

// TODO: CRIO_TASK_MODULE_TEST - Implement checkout function
/**
 * Checkout a users cart.
 * On success, users cart must have no products.
 *
 * @param {User} user
 * @returns {Promise}
 * @throws {ApiError} when cart is invalid
 */
const checkout = async (user) => {
  const cart = await Cart.findOne({ email: user.email });

  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, "User does not have a cart");
  }

  if (!cart.cartItems || cart.cartItems.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST);
  }
  let userhas = await user.hasSetNonDefaultAddress();
  if (!userhas) {
    throw new ApiError(httpStatus.BAD_REQUEST);
  }

  const totalCost = cart.cartItems.reduce(
    (cost, item) => cost + item.product.cost * item.quantity,
    0
  );

  if (totalCost > user.walletMoney) {
    throw new ApiError(httpStatus.BAD_REQUEST);
  }

  user.walletMoney -= totalCost;
  await user.save();
  cart.cartItems = new Array();
  await cart.save();
};

module.exports = {
  getCartByUser,
  addProductToCart,
  updateProductInCart,
  deleteProductFromCart,
  checkout,
};
