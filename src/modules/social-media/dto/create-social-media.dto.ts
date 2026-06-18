import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsEnum } from 'class-validator';

export enum SocialPlatform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  WHATSAPP = 'whatsapp',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
}

export class CreateSocialMediaDto {
  @IsNotEmpty()
  @IsEnum(SocialPlatform)
  plataforma: SocialPlatform;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  usuario?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
