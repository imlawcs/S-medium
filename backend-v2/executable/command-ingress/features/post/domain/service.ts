import Post from '../../../../../internal/model/post';
import User from '../../../../../internal/model/user';
import { PostEntity, PostCreationDto, PostService, PostUpdateDto } from '../types';

export class PostServiceImpl implements PostService {
  async getPost(id: string): Promise<PostEntity> {
    const post = await Post.findOne({ _id: id });

    if (!post) {
      throw new Error('Post not found');
    }

    const user = await User.findOne({ _id: post.author });

    return {
      id: String(post._id),
      image: String(post.image),
      authorID: String(post.author),
      markdown: post.markdown,
      title: post.title,
      tags: post.tags,
      summary: post.summary,
      createdAt: Number(post.createdAt),
      author: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    };
  }

  async fetchPostsByUser(id: string): Promise<PostEntity[]> {
    const results = await Post.find({ author: id })
      .lean(true);

    return results.map(r => ({
      id: String(r._id),
      title: String(r.title || ''),
      markdown: r.markdown,
      image: r.image,
      authorID: id,
      tags: r.tags,
      summary: String(r.summary || ''),
      createdAt: Number(r.createdAt),
    }));
  }

  async createPost(postCreationDto: PostCreationDto): Promise<PostEntity> {
    const codeRegex = /<code>(.*?)<\/code>/g;
    const withoutCode = postCreationDto.markdown.replace(codeRegex, '');
    const htmlRegexG = /<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/g;
    const summary = withoutCode.replace(htmlRegexG, '');

    const insertResult = await Post.create({
      author: postCreationDto.authorID,
      title: postCreationDto.title,
      markdown: postCreationDto.markdown,
      image: postCreationDto.image,
      tags: postCreationDto.tags,
      summary: summary,
    });

    return {
      id: String(insertResult._id),
      image: String(insertResult.image),
      authorID: String(insertResult.author),
      markdown: insertResult.markdown,
      title: insertResult.title,
      tags: insertResult.tags,
      summary: insertResult.summary,
      createdAt: Number(insertResult.createdAt),
    }
  }

  async updatePost(id: string, postUpdateDto: PostUpdateDto): Promise<PostEntity> {
    const post = await Post.findOne({ _id: id });
    if (!post) {
        throw new Error('Post not found');
    }

    const codeRegex = /<code>(.*?)<\/code>/g;
    const withoutCode = postUpdateDto.markdown.replace(codeRegex, '');
    const htmlRegexG = /<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/g;
    const summary = withoutCode.replace(htmlRegexG, '');

    const updatePost = await Post.updateOne({ _id: id }, {
      title: postUpdateDto.title,
      markdown: postUpdateDto.markdown,
      image: postUpdateDto.image,
      tags: postUpdateDto.tags,
      summary: summary,
    });

    if (updatePost.modifiedCount !== 1) {
      throw new Error('Update post failed');
    }

    return {
      id: String(post._id),
      image: String(post.image),
      authorID: String(post.author),
      markdown: post.markdown,
      title: post.title,
      tags: post.tags,
      summary: summary,
      createdAt: Number(post.createdAt),
    }
  }

  async deletePost(id: string): Promise<boolean> {
    const post = await Post.findOne({ _id: id });
    if (!post) {
      throw new Error('Post not found');
    }

    const deleteResult = await Post.deleteOne
      ({ _id: id });
    return deleteResult.deletedCount === 1;
  }
}
