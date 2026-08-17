# 前端镜像：托管 npm run build:prod 产物 dist/
# 流水线在宿主机完成 npm build 后，再执行 docker build 打镜像（与后端流水线同构）
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
