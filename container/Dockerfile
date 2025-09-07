FROM nginx:alpine
RUN apk add --no-cache git
RUN mkdir -p /app
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

RUN rm -rf /usr/share/nginx/html/*

EXPOSE 80

CMD ["/usr/local/bin/start.sh"]
