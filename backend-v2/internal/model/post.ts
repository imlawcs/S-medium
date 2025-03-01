import { InferSchemaType, model, Schema } from 'mongoose';

const postSchema = new Schema(
  {
    title: {
      type: String,
      require: true,
    },
    markdown: {
      type: String,
      require: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    tags: [{ type: String, required: true }],
    image: String,
    summary: String,
  },
  { timestamps: true }
);

type postSchemaInferType = InferSchemaType<typeof postSchema>;

export default model<postSchemaInferType>('posts', postSchema);
