import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { uploadProfileImg } from './users.multerOptions';
import { Review } from '../entities/review.entity';
import { Like } from '../entities/like.entity';
import { Comment } from '../entities/comment.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) //쿼리 날리는 클래스
    private userRepository: Repository<User>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    private readonly jwtService: JwtService
  ) {}

  async signup(createUserDto: CreateUserDto): Promise<User> {
    const user = new User();
    user.userId = createUserDto.kakaoId;
    user.nickname = createUserDto.nickName;
    user.gender = createUserDto.gender;
    user.genres = createUserDto.genre;
    user.ageRange = createUserDto.ageRange;
    user.profileImg = createUserDto.profileImg;
    return await this.userRepository.save(user);
  }

  async findOne(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { userId: id } });
  }

  async findByNickname(nickname: string): Promise<User> {
    return this.userRepository.findOne({ where: { nickname } });
  }

  async getAllComment(nickname: string): Promise<Comment[]> {
    return this.commentRepository.find({ where: { nickname } });
  }

  async checkNick(nickname: string): Promise<boolean> {
    const exNick = await this.userRepository.findOne({ where: { nickname } });
    if (exNick) return true;
    return false;
  }

  async Login(id: string): Promise<boolean> {
    const CheckUser = await this.userRepository.findOne({
      where: { userId: id },
    });
    if (CheckUser) return true;
    return false;
  }

  async update(
    id: string,
    imgfile,
    updateUserDto: UpdateUserDto
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { userId: id } });
    if (updateUserDto.info) {
      user.info = updateUserDto.info;
    }
    if (updateUserDto.genre) {
      user.genres = updateUserDto.genre;
    }
    if (imgfile) {
      user.profileImg = await uploadProfileImg(imgfile);
    } else {
      user.profileImg = updateUserDto.imgUrl;
    }
    if (updateUserDto.profileImg) {
      user.profileImg = updateUserDto.profileImg;
    }
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.delete(user);
  }

  async generateToken(id: string): Promise<string> {
    return this.jwtService.sign({ id });
  }

  // async getMyReviews(id: string): Promise<Review> {
  //   return this.reviewRepository.findAll({ where: { userId: id } });
  // });

  async getMyReviews(nickname: string) {
    const user = await this.userRepository.findOne({ where: { nickname } });
    return this.reviewRepository.find({ where: { user: user } });
  }

  async getMyLikes(nickname: string) {
    const user = await this.userRepository.findOne({ where: { nickname } });
    return this.likeRepository.find({ where: { user: user } });
  }

  //nickname으로 유저 서치
  async getUserByNickname(nickname: string) {
    const exUser = await this.userRepository.findOne({ where: { nickname } });
    if (exUser) {
      return exUser;
    } else {
      return { type: 0, error: 'User not found' };
    }
  }

  //follow기능
  async followUser(currentUserId: string, nickname: string) {
    const I = await this.userRepository.findOne({ userId: currentUserId });

    const opponentUserNickname = nickname['nickname'];

    const opponent = await this.userRepository.findOne({
      nickname: opponentUserNickname,
    });

    if (opponent === undefined) return 'User not found';

    I.followings = [opponent];

    opponent.followers = [I];

    const result1 = await this.userRepository.save(I);
    const result2 = await this.userRepository.save(opponent);

    if (result1 && result2) return true;
    else return false;
  }

  //unfollow기능
  async unfollowUser(currentUserId: string, nickname: string) {
    const I = await this.userRepository
      .createQueryBuilder('user')
      .where('user.userId = :userId', { userId: currentUserId })
      .innerJoinAndSelect('user.followings', 'followings')
      .getOne();

    const opponentUserNickname = nickname['nickname'];

    const opponent = await this.userRepository
      .createQueryBuilder('user')
      .where('user.nickname = :nickname', { nickname: opponentUserNickname })
      .innerJoinAndSelect('user.followers', 'followers')
      .getOne();

    if (opponent === undefined) return 'User not found';

    I.followings = I.followings.filter((following) => {
      following.id !== opponent.id;
    });

    opponent.followers = opponent.followers.filter((follower) => {
      follower.id !== I.id;
    });

    const result1 = await this.userRepository.save(I);
    const result2 = await this.userRepository.save(opponent);

    if (result1 && result2) return true;
    else return false;
  }
}
