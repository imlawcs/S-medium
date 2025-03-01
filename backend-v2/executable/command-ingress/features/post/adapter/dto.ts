import { Length } from 'class-validator';
import { RequestDto } from '../../auth/adapter/dto';

export class CreatePostBody extends RequestDto {
  title: string;
  markdown: string;
  image: string;
  tags: string[];

  constructor(body: any) {
    super();
    if (body) {
      this.title = body.title;
      this.markdown = body.markdown;
      this.image = body.image;
      this.tags = body.tags;
    }
  }
}

export class UpdatePostBody extends RequestDto {
  title: string;
  markdown: string;
  image: string;
  tags: string[];

  constructor(body: any) {
    super();
    if (body) {
      this.title = body.title;
      this.markdown = body.markdown;
      this.image = body.image;
      this.tags = body.tags;
    }
  }
}

// Data transfer object
export class GetPostDto extends RequestDto {
  @Length(24)
  id: string;

  constructor(requestParams: any) {
    super();
    if (requestParams) {
      this.id = requestParams.id;
    }
  }
}

export class DeletePost extends RequestDto {
  @Length(24)
  id: string;

  constructor(requestParams: any) {
    super();
    if (requestParams) {
      this.id = requestParams.id;
    }
  }
}