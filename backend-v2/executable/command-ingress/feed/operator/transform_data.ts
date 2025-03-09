import { Operator } from '../pipeline'
import UserModel from '../../../../internal/model/user'
import PostModel from '../../../../internal/model/post'
import _ from 'lodash'

export class TransformDataOperator implements Operator {

    async run(data: any): Promise<any> {
        if (data.operationType === 'insert') {
            return this.insert(data)
        } else if (data.operationType === 'update') {
            return this.update(data)
        }
        return null;
    }

    async insert(data: any): Promise<any> {
        const authorId = _.get(data, 'fullDocument.author');
        const author = await UserModel.findById(authorId).select('name avatar followers');
        
        if (!author) {
            console.log(`[TransformData] Author not found for ID: ${authorId}`);
            return null;
        }
        
        data.fullDocument.author = author;
        
        const followers = _.get(author, 'followers', []).map((follower) => String(follower));
        
        const timestamp = new Date(_.get(data, 'fullDocument.createdAt', new Date())).getTime();
        
        return {
            sinkData: {
                ...data,
                followers,
                postMetadata: {
                    postId: String(_.get(data, 'fullDocument._id')),
                    timestamp,
                    authorId: String(authorId),
                    operationType: 'insert'
                }
            }
        }
    }

    async update(data: any): Promise<any> {
        const newPost = await PostModel.findById(data.documentKey._id).populate('author');
        
        if (!newPost) {
            console.log(`[TransformData] Post not found for ID: ${data.documentKey._id}`);
            return null;
        }
        
        data.fullDocument = newPost;
        
        const followers = _.get(newPost, 'author.followers', []).map((follower) => String(follower));
        
        const timestamp = new Date(_.get(newPost, 'updatedAt', new Date())).getTime();
        
        return {
            sinkData: {
                ...data,
                followers,
                postMetadata: {
                    postId: String(data.documentKey._id),
                    timestamp,
                    authorId: String(_.get(newPost, 'author._id')),
                    operationType: 'update'
                }
            }
        }
    }
}