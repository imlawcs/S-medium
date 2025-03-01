import {InferSchemaType, model, Schema} from 'mongoose';

const tagSchema = new Schema({

});

type tagSchemaInferType = InferSchemaType<typeof tagSchema>;

export default model<tagSchemaInferType>('tags', tagSchema);
