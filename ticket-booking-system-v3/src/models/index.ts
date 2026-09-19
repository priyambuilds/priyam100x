import mongoose from "mongoose";
const mongodbUrl = process.env.MONGODB_URI;
if (!mongodbUrl) {
    throw new Error("MONGODB_URI environment variable is required");
}
mongoose.connect(mongodbUrl);

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
}, { timestamps: true });
const showSchema = new mongoose.Schema({
    movieId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MovieModel",
        required: true,
        index: true
    },
    screenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ScreenModel",
        required: true,
        index: true,
    },
    theatreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TheatreModel",
        required: true,
        index: true,
    },
    cityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CityModel",
        required: true,
        index: true,
    },
    startsAt: {
        type: Date,
        required: true,
        index: true
    },
    endsAt: {
        type: Date,
        required: true,
        index: true
    },
    availableSeatsCount: {
        
    },
    status: {

    },
    movieName: {
        type: String,
        required: true,
        unique: true,
    },
    showTime: {
        type: String,
        required: true,
    },
    ticketPriceInCents: {
        type: Number,
        min: 0,
        required: true,
    },
    availableTickets: {
        type: Number,
        required: true,
    },
},
    {
        timestamps: true
});
const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserModel",
        required: true,
    },
    showId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShowModel",
        required: true,
    },
    seats: {
        type: Number,
        required: true,
        min: 1
    },
    totalAmountInCents: {
        type: Number,
        required: true,
       
    },
}, {
        timestamps: true
});

export const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserModel",
        unique: true,
        required: true
    },
    amountInCents: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
}, {
    timestamps: true
})

export const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserModel",
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ["topup", "booking"]
    },
    amountInCents: {
        type: Number,
        required: true,
        min: 0
    },
    walletAmountBeforeInCents: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    walletAmountAfterInCents: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BookingModel",
    },
    status: {
        type: String,
        required: true,
        enum: ["failed", "completed"]
    },
}, {
    timestamps: true
})

const citySchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
    },
    active: {
        type: Boolean,
        default: true
    }
})
const theatreSchema = new mongoose.Schema({
    cityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CityModel",
        required: true,
        unique: true
    },
    name: {
        type: String,
        unique: true,
        required: true
    },
        active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})
const screenSchema = new mongoose.Schema({
    theatreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TheatreModel",
        required: true
    },
    name: {
        type: String,
        unique: true,
        required: true,
    },
    active: {
        type: Boolean,
        default: true
    }
},{
    timestamps: true
})
const seatSchema = new mongoose.Schema({
    screenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ScreenModel",
        required: true
    },
    number: {
        type: Number,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
},{
    timestamps: true
})
const movieSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    durationInMinutes: {
        type: Number,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
},{
    timestamps: true
})

const UserModel = mongoose.model("UserModel", userSchema);
const ShowModel = mongoose.model("ShowModel", showSchema);
const BookingModel = mongoose.model("BookingModel", bookingSchema);
const WalletModel = mongoose.model("WalletModel", walletSchema);
const TransactionModel = mongoose.model("TransactionModel", transactionSchema);
const CityModel = mongoose.model("CityModel", citySchema);
const TheatreModel = mongoose.model("TheatreModel", theatreSchema);
const ScreenModel = mongoose.model("ScreenModel", screenSchema);
const SeatModel = mongoose.model("SeatModel", seatSchema);
const MovieModel = mongoose.model("MovieModel", movieSchema);


export {UserModel, ShowModel, BookingModel, WalletModel, TransactionModel, CityModel, ScreenModel, TheatreModel, MovieModel};