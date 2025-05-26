const Docker = require('dockerode');
const validator = require('validator');

class ContainerManager {
  constructor(userService) {
    this.docker = new Docker();
    this.containers = new Map(); // username -> { containerId, createdAt }
    this.CONTAINER_LIFETIME = 2 * 60 * 60 * 1000; // 2小时
    this.userService = userService;
  }

  /**
   * 验证用户名是否符合Linux用户名规则
   */
  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return false;
    }

    // Linux用户名规则：
    // - 长度1-32字符
    // - 只能包含小写字母、数字、下划线、连字符
    // - 必须以字母开头
    // - 不能以连字符结尾
    const regex = /^[a-z][a-z0-9_-]{0,31}$/;
    return regex.test(username) && !username.endsWith('-');
  }

  /**
   * 获取或创建用户容器 - 支持一人一号逻辑
   */
  async getOrCreateContainer(username) {
    const containerName = `linuxdo-${username}`;

    try {
      // 1. 检查用户是否已存在于数据库
      if (this.userService) {
        const existingUser = await this.userService.getUser(username);
        if (existingUser) {
          console.log(`用户 ${username} 已存在，检查容器状态...`);

          // 检查容器是否还在运行
          const containers = await this.docker.listContainers({ all: true });
          const existingContainer = containers.find(container =>
            container.Names.some(name => name === `/${containerName}`)
          );

          if (existingContainer) {
            // 容器存在，启动它（如果未运行）
            const container = this.docker.getContainer(existingContainer.Id);
            if (existingContainer.State !== 'running') {
              console.log(`启动现有容器 ${containerName}...`);
              await container.start();
            }

            // 更新最后登录时间
            await this.userService.updateLastLogin(username);

            // 记录容器信息到内存
            this.containers.set(username, {
              containerId: existingContainer.Id,
              createdAt: Date.now()
            });

            return {
              containerId: existingContainer.Id,
              isNew: false,
              message: '欢迎回来！你的容器已恢复'
            };
          } else {
            // 用户存在但容器不存在，重新创建
            console.log(`用户 ${username} 的容器已丢失，重新创建...`);
            const containerId = await this.createContainer(username);

            // 更新最后登录时间
            await this.userService.updateLastLogin(username);

            this.containers.set(username, {
              containerId,
              createdAt: Date.now()
            });

            return {
              containerId,
              isNew: true,
              message: '你的容器已重新创建'
            };
          }
        }
      }

      // 2. 新用户，检查内存中是否有容器记录
      if (this.containers.has(username)) {
        const containerInfo = this.containers.get(username);
        try {
          const container = this.docker.getContainer(containerInfo.containerId);
          const info = await container.inspect();

          if (info.State.Running) {
            return {
              containerId: containerInfo.containerId,
              isNew: false,
              message: '容器已就绪'
            };
          }
        } catch (error) {
          // 容器不存在，从映射中移除
          this.containers.delete(username);
        }
      }

      // 3. 创建新容器
      const containerId = await this.createContainer(username);

      // 4. 记录新用户到数据库
      if (this.userService) {
        await this.userService.createUser(username, containerId, containerName);
        console.log(`新用户 ${username} 已注册`);
      }

      // 记录容器信息到内存
      this.containers.set(username, {
        containerId,
        createdAt: Date.now()
      });

      return {
        containerId,
        isNew: true,
        message: '欢迎来到LinuxDo自习室！'
      };
    } catch (error) {
      console.error('获取或创建容器失败:', error);
      throw error;
    }
  }

  /**
   * 创建Docker容器
   */
  async createContainer(username) {
    const containerName = `linuxdo-${username}`;

    try {
      // 确保镜像存在
      await this.ensureImage();

      // 检查并清理同名容器
      try {
        const existingContainer = this.docker.getContainer(containerName);
        const info = await existingContainer.inspect();
        console.log(`发现同名容器 ${containerName}，正在清理...`);

        if (info.State.Running) {
          await existingContainer.kill();
        }
        await existingContainer.remove();
        console.log(`同名容器 ${containerName} 已清理`);
      } catch (error) {
        // 容器不存在，继续创建
        console.log(`容器 ${containerName} 不存在，继续创建`);
      }

      // 创建容器
      const container = await this.docker.createContainer({
        Image: 'linuxdo-ubuntu:latest',
        name: containerName,
        Tty: true,
        OpenStdin: true,
        StdinOnce: false,
        Env: [
          `USER=${username}`,
          'TERM=xterm-256color'
        ],
        WorkingDir: `/home/${username}`,
        Cmd: ['/bin/bash'],
        HostConfig: {
          Memory: 512 * 1024 * 1024, // 512MB内存限制
          CpuShares: 512, // CPU限制
          NetworkMode: 'bridge',
          ReadonlyRootfs: false,
          SecurityOpt: ['no-new-privileges:true'],
          CapDrop: ['ALL'],
          CapAdd: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'SETGID', 'SETUID']
        }
      });

      // 启动容器
      await container.start();

      // 创建用户账户
      await this.setupUser(container, username);

      return container.id;
    } catch (error) {
      console.error('创建容器失败:', error);
      throw new Error('容器创建失败');
    }
  }

  /**
   * 确保基础镜像存在
   */
  async ensureImage() {
    try {
      await this.docker.getImage('linuxdo-ubuntu:latest').inspect();
    } catch (error) {
      // 镜像不存在，构建它
      console.log('构建LinuxDo Ubuntu镜像...');
      await this.buildImage();
    }
  }

  /**
   * 构建基础镜像
   */
  async buildImage() {
    const dockerfile = `
FROM ubuntu:22.04

# 设置非交互模式
ENV DEBIAN_FRONTEND=noninteractive

# 更新系统并安装基础软件
RUN apt-get update && apt-get install -y \\
    sudo \\
    curl \\
    wget \\
    git \\
    vim \\
    nano \\
    htop \\
    tree \\
    unzip \\
    build-essential \\
    python3 \\
    python3-pip \\
    nodejs \\
    npm \\
    && apt-get clean \\
    && rm -rf /var/lib/apt/lists/*

# 创建sudo组（如果不存在）
RUN groupadd -f sudo

# 设置默认shell
RUN echo "dash dash/sh boolean false" | debconf-set-selections && \\
    dpkg-reconfigure -f noninteractive dash

WORKDIR /root
CMD ["/bin/bash"]
`;

    const stream = await this.docker.buildImage({
      context: __dirname,
      src: ['Dockerfile']
    }, {
      t: 'linuxdo-ubuntu:latest',
      dockerfile: 'Dockerfile'
    });

    // 写入Dockerfile
    const fs = require('fs');
    const path = require('path');
    const dockerfilePath = path.join(__dirname, 'Dockerfile');
    fs.writeFileSync(dockerfilePath, dockerfile);

    return new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err, res) => {
        // 清理临时文件
        try {
          fs.unlinkSync(dockerfilePath);
        } catch (e) {}

        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  /**
   * 在容器中设置用户
   */
  async setupUser(container, username) {
    const commands = [
      // 创建用户
      `useradd -m -s /bin/bash ${username}`,
      // 添加到sudo组
      `usermod -aG sudo ${username}`,
      // 设置无密码sudo
      `echo "${username} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers`,
      // 设置用户目录权限
      `chown -R ${username}:${username} /home/${username}`,
      // 创建欢迎文件
      `echo "欢迎来到LinuxDo自习室！\\n你现在在一个独立的Ubuntu 22.04容器中。\\n可以自由安装软件包和进行实验。\\n\\n容器将在2小时后自动销毁。" > /home/${username}/welcome.txt`,
      `chown ${username}:${username} /home/${username}/welcome.txt`
    ];

    for (const cmd of commands) {
      try {
        const exec = await container.exec({
          Cmd: ['bash', '-c', cmd],
          AttachStdout: true,
          AttachStderr: true
        });
        await exec.start();
      } catch (error) {
        console.error(`执行命令失败: ${cmd}`, error);
      }
    }
  }

  /**
   * 获取活跃用户列表
   */
  async getActiveUsers() {
    const users = [];
    for (const [username, info] of this.containers.entries()) {
      try {
        const container = this.docker.getContainer(info.containerId);
        const containerInfo = await container.inspect();

        if (containerInfo.State.Running) {
          users.push({
            username,
            containerId: info.containerId,
            createdAt: info.createdAt,
            uptime: Date.now() - info.createdAt
          });
        }
      } catch (error) {
        // 容器不存在，从映射中移除
        this.containers.delete(username);
      }
    }
    return users;
  }

  /**
   * 清理过期容器
   */
  async cleanupExpiredContainers() {
    const now = Date.now();
    const expiredUsers = [];

    for (const [username, info] of this.containers.entries()) {
      if (now - info.createdAt > this.CONTAINER_LIFETIME) {
        expiredUsers.push(username);
      }
    }

    for (const username of expiredUsers) {
      try {
        await this.removeContainer(username);
        console.log(`清理过期容器: ${username}`);
      } catch (error) {
        console.error(`清理容器失败: ${username}`, error);
      }
    }
  }

  /**
   * 移除容器
   */
  async removeContainer(username) {
    const containerInfo = this.containers.get(username);
    if (!containerInfo) return;

    try {
      const container = this.docker.getContainer(containerInfo.containerId);
      await container.kill();
      await container.remove();
    } catch (error) {
      console.error('移除容器失败:', error);
    } finally {
      this.containers.delete(username);
    }
  }
}

module.exports = ContainerManager;
