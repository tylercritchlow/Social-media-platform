CREATE DATABASE IF NOT EXISTS nodelogin;

USE nodelogin;

CREATE TABLE IF NOT EXISTS `createdPosts` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `user` VARCHAR(50) NOT NULL,
    `postcontent` TEXT NOT NULL,
    `pictures` LONGBLOB,
    `created_on` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `logins` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`)
);