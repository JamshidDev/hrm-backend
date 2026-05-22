FROM php:8.3-fpm

USER root

RUN apt-get update && apt-get install -y libreoffice

RUN groupadd -g 1000 sail && useradd -m -u 1000 -g sail sail

USER sail
