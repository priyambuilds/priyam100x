import mongoose from "mongoose";
mongoose.connect("mongodb+srv://deypriyam807_db_user:****@cluster0.fzqkt7d.mongodb.net/todo");
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
}, {timestamps: true});

const showSchema = new mongoose.Schema({
  movieName: {
    type: String,
    required: true
  },
  showTime: {
    type: Date,
    required: true
  },
  ticketPrice: {
    type: Number,
    required: true,
    min: 0
  },
  availableTickets: {
    type: Number,
    required: true,
    min: 0
  },
}, { 
  timestamps: true 
});

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  showId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Show',
    required: true
  },
  seats: {
    type: Number,
    required: true,
    min: 1
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  }
}, { 
  timestamps: true
});

const UserModel = mongoose.model("UserModel", userSchema);
const ShowModel = mongoose.model("ShowModel", showSchema);
const BookingModel = mongoose.model("BookingModel", bookingSchema);

export {UserModel, ShowModel, BookingModel};
