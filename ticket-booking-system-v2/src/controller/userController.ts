import jwt from "jsonwebtoken";
import { UserModel } from "../models/models.ts";
import { type Request, type Response } from "express";
import { signupSchema, signinSchema } from '../types/index.ts';

const signupController = async (req: Request, res: Response) => {
  const parsedData = signupSchema.safeParse(req.body)

  if (!parsedData.success) {
    return res.status(400).json({error: parsedData.error.issues})
  }

  const { username, email, password, role } = parsedData.data;
  const userExists = await UserModel.findOne({username});

  if (userExists) {
    return res.status(411).json({
      success: false,
      message: "User with this username already exists",
    });
  }

  const newUser = await UserModel.create({
    username,
    email,
    password,
    role,
  });

  res.status(201).json({
    success: true,
    data: {
      id: newUser._id,
    },
    message: "user added successfully",
  });
};

const signinController = async (req: Request, res: Response) => {
  const parsedData = signinSchema.safeParse(req.body)

  if (!parsedData.success) {
    return res.status(400).json({error: parsedData.error.issues})
  }
  
  const { username, password } = parsedData.data;

  const userExists = await UserModel.findOne({
    username,
    password,
  });

  if (!userExists) {
    res.status(411).json({
      success: false,
      message: "Incorrect credentials",
    });
    return;
  }

  const token = jwt.sign(
  
    {
      userId: userExists.id,
      role: userExists.role,
    },
    "ultrasupersecretpassword123",
  );

  res.json({
    success: true,
    message: "Signed in successfully",
    data: {
      authorization: token,
    }
  });
};

export { signinController, signupController};
