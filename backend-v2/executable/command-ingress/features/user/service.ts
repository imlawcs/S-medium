import asyncHandler from 'express-async-handler';
import UserModel from '../../../../internal/model/user';

export const editUser = asyncHandler(async (req, res, next) => {

});

export const deleteUser = asyncHandler(async (req, res, next) => {

});

export const followUser = asyncHandler(async (req, res, next) => {

});

export const unfollowUser = asyncHandler(async (req, res, next) => {

});

export const suggestUsers = asyncHandler(async (req, res, next) => {

});

export const getUser = asyncHandler(async (req, res, _next) => {
  const {userId} = req.params;
  const user = await UserModel.findOne({_id: userId});
  if (!user) {
    res.status(404).json({
      message: 'user not found',
    });

    return;
  }
  res.json(user);
});

export const getUserIntrests = asyncHandler(async (req, res, next) => {

});

export const addUserIntrests = asyncHandler(async (req, res, next) => {

});

export const removeUserIntrests = asyncHandler(async (req, res, next) => {

});

// totdo pagination
export const getNotifications = asyncHandler(async (req, res, next) => {

});

export const getAllFollowers = asyncHandler(async (req, res, next) => {

});

export const getAllFollowings = asyncHandler(async (req, res, next) => {

});

export const getAllList = asyncHandler(async (req, res, next) => {

});
