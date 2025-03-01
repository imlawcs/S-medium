import {InferSchemaType, model, Schema} from 'mongoose';

const sessionSchema = new Schema({
    sessionID: {
        type: String,
        required: true,
        unique: true,
    },
    userID: {
        type: String,
        required: true,
    },
}, { timestamps: true });

type tokenSchemaInferType = InferSchemaType<typeof sessionSchema>;
export default model<tokenSchemaInferType>('sessions', sessionSchema);
