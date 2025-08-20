// ==UserScript==
// @name         AugmentCode自动注册
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  自动完成AugmentCode的注册流程
// @author       AugmentCode-AutoRegister-Userscript
// @match        https://*.augmentcode.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=augmentcode.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_log
// @connect      tempmail.plus
// ==/UserScript==

(function() {
    'use strict';


    // 主邮箱域名常量，用于生成标准格式的邮箱地址
    const EMAIL_DOMAIN = "@test.com";// 

    /**
 * 临时邮箱服务配置
 * 用于需要临时接收验证邮件的场景
 */
    const TEMP_MAIL_CONFIG = {
        username: "test",    // 临时邮箱用户名
        emailExtension: "@mailto.plus", // 临时邮箱扩展域名
        epin: "000"     // 临时邮箱PIN码
    };

    const FIRST_NAMES = ["alex", "emily", "jason", "olivia", "ryan", "sophia", "thomas", "isabella", "william", "mia", "james", "ava", "noah", "charlotte", "ethan", "amelia", "jacob", "evelyn", "mason", "abigail"];
    const LAST_NAMES = ["taylor", "anderson", "thompson", "jackson", "white", "harris", "martin", "thomas", "lewis", "clark", "lee", "walker", "hall", "young", "allen", "king", "wright", "scott", "green", "adams"];

    // 持续注册控制变量 - 使用本地存储保持状态
    var isAutoRegistering = GM_getValue('isAutoRegistering', false);
    var registrationCount = GM_getValue('registrationCount', 0);
    var registeredAccounts = GM_getValue('registeredAccounts', []); // 存储注册成功的账户信息

    // ==================== 工具函数 ====================

    // 状态保存函数
    function saveState() {
        GM_setValue('isAutoRegistering', isAutoRegistering);
        GM_setValue('registrationCount', registrationCount);
        GM_setValue('registeredAccounts', registeredAccounts);
    }

    // 清除账户信息函数（只清除注册好的用户信息）
    function clearAccountsData() {
        try {
            GM_setValue('registrationCount', 0);
            GM_setValue('registeredAccounts', []);
            registrationCount = 0;
            registeredAccounts = [];
            saveState();
            return true;
        } catch (error) {
            console.error('清除账户数据失败:', error);
            return false;
        }
    }

    // 等待元素出现
    async function waitForElement(selector, timeout = 10000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) return element;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return null;
    }

    // 等待页面跳转
    async function waitForPageTransition(selector, timeout = 10000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (typeof selector === 'string' && selector.includes('.com')) {
                if (window.location.href.includes(selector)) return true;
            } else {
                if (document.querySelector(selector)) return true;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return false;
    }

    // 生成随机邮箱
    function generateEmail() {
        const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        const timestamp = Date.now().toString(36);
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const username = `${firstName}${lastName}${timestamp}${randomNum}`;
        return `${username}${EMAIL_DOMAIN}`;
    }

    // 提取验证码
    function extractVerificationCode(text) {
        const patterns = [
            /verification code is[:\s]*([A-Z0-9]{6})/i,
            /code[:\s]*([A-Z0-9]{6})/i,
            /(?<![a-zA-Z@.])\b\d{6}\b/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1] || match[0];
        }
        return null;
    }

    // ==================== 邮件处理函数 ====================


    // 颜色配置
    const COLORS = {
        primary: '#3498db',
        secondary: '#2ecc71',
        danger: '#e74c3c',
        warning: '#f39c12',
        info: '#34495e',
        light: '#ecf0f1',
        dark: '#2c3e50',
        background: 'rgba(30, 30, 30, 0.95)'
    };

    // 日志UI配置
    const LOG_UI_CONFIG = {
        position: {
            bottom: 40,
            left: 20
        },
        dimensions: {
            width: 320,
            maxHeight: 450
        }
    };

    // 创建日志UI - 位置改到左下角，样式和颜色更新
    function createLogUI() {
        const logContainer = document.createElement('div');
        logContainer.id = "auto-register-log";
        logContainer.style.cssText = `
            position: fixed;
            bottom: ${LOG_UI_CONFIG.position.bottom}px;
            left: ${LOG_UI_CONFIG.position.left}px;
            width: ${LOG_UI_CONFIG.dimensions.width}px;
            max-height: ${LOG_UI_CONFIG.dimensions.maxHeight}px;
            background: ${COLORS.background};
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        logContainer.innerHTML = `
            <div style="
                padding: 14px 16px;
                background: ${COLORS.primary};
                color: white;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid ${COLORS.secondary};
            ">
                <span>自动注册助手</span>
                <div>
                    <button id="start-continuous-registration" style="
                        background: ${COLORS.secondary};
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 13px;
                        padding: 6px 12px;
                        border-radius: 4px;
                        margin-right: 8px;
                        transition: all 0.2s ease;
                    ">开始持续注册</button>
                    <button id="stop-registration" style="
                        background: ${COLORS.error};
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 13px;
                        padding: 6px 12px;
                        border-radius: 4px;
                        margin-right: 8px;
                        display: none;
                        transition: all 0.2s ease;
                    ">停止注册</button>
                    <button id="export-accounts" style="
                        background: ${COLORS.primary};
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 13px;
                        padding: 6px 12px;
                        border-radius: 4px;
                        margin-right: 8px;
                        transition: all 0.2s ease;
                    ">导出账户</button>
                    <button id="clear-state" style="
                        background: ${COLORS.warning};
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 13px;
                        padding: 6px 12px;
                        border-radius: 4px;
                        margin-right: 8px;
                        transition: all 0.2s ease;
                    ">清除账户</button>
                    <button id="clear-log" style="
                        background: transparent;
                        border: 1px solid rgba(255, 255, 255, 0.7);
                        color: white;
                        cursor: pointer;
                        font-size: 13px;
                        padding: 6px 12px;
                        border-radius: 4px;
                        transition: all 0.2s ease;
                    ">清除</button>
                    <button id="minimize-log" style="
                        background: transparent;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 16px;
                        padding: 6px 12px;
                        margin-left: 8px;
                        transition: all 0.2s ease;
                    ">_</button>
                </div>
            </div>
            <div style="
                padding: 8px 16px;
                background: ${COLORS.dark};
                border-bottom: 1px solid ${COLORS.info};
                font-size: 12px;
                color: ${COLORS.light};
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <span style="color: ${COLORS.secondary};">📢</span>
                <span>操作控制台</span>
            </div>
            <div id="registration-status" style="
                padding: 8px 16px;
                background: ${COLORS.background};
                border-bottom: 1px solid ${COLORS.border};
                font-size: 12px;
                color: ${COLORS.text};
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <span>注册状态: <span id="status-text">未开始</span></span>
                <span>已注册: <span id="account-count">0</span> 个账户</span>
            </div>
            <div id="log-content" style="
                padding: 16px;
                overflow-y: auto;
                max-height: calc(${LOG_UI_CONFIG.dimensions.maxHeight}px - 120px);
                font-size: 14px;
                color: ${COLORS.light};
                line-height: 1.5;
            "></div>
        `;

        document.body.appendChild(logContainer);

        // 最小化功能
        let isMinimized = false;
        const logContent = document.getElementById('log-content');
        const minimizeBtn = document.getElementById('minimize-log');

        minimizeBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            logContent.style.display = isMinimized ? 'none' : 'block';
            minimizeBtn.textContent = isMinimized ? '▢' : '_';
        });

        // 清除日志功能
        const clearBtn = document.getElementById('clear-log');
        clearBtn.addEventListener('click', () => {
            logContent.innerHTML = '';
            log('日志已清除', 'info');
        });

        // 按钮事件处理
        const startBtn = document.getElementById('start-continuous-registration');
        const stopBtn = document.getElementById('stop-registration');
        const exportBtn = document.getElementById('export-accounts');
        const clearStateBtn = document.getElementById('clear-state');

        // 开始持续注册
        startBtn.addEventListener('click', () => {
            startContinuousRegistration();
        });

        // 停止注册
        stopBtn.addEventListener('click', () => {
            stopContinuousRegistration();
        });

        // 导出账户
        exportBtn.addEventListener('click', () => {
            exportAccounts();
        });

        // 清除账户数据
        clearStateBtn.addEventListener('click', () => {
            // 显示清除前状态
            logger.log(`清除前账户数据: 计数=${registrationCount}, 账户数=${registeredAccounts.length}`, 'info');
            logger.log(`清除前存储值: 计数=${GM_getValue('registrationCount')}, 账户数=${GM_getValue('registeredAccounts', []).length}`, 'info');

            if (confirm('确定要清除所有已注册的账户信息吗？（不会影响当前注册状态）')) {
                const clearResult = clearAccountsData();

                if (clearResult) {
                    // 立即更新UI显示
                    updateRegistrationStatus();

                    // 验证清除结果
                    logger.log(`清除后账户数据: 计数=${registrationCount}, 账户数=${registeredAccounts.length}`, 'info');
                    logger.log(`清除后存储值: 计数=${GM_getValue('registrationCount')}, 账户数=${GM_getValue('registeredAccounts', []).length}`, 'info');
                    logger.log(`注册状态保持: ${isAutoRegistering ? '持续注册中' : '已停止'}`, 'info');

                    if (registrationCount === 0 && registeredAccounts.length === 0) {
                        logger.log('✅ 账户数据清除成功！', 'success');
                    } else {
                        logger.log('❌ 账户数据清除可能失败，请检查', 'error');
                    }

                    // 测试导出功能验证
                    setTimeout(() => {
                        logger.log('验证清除结果：测试导出功能...', 'info');
                        exportAccounts();
                    }, 1000);
                } else {
                    logger.log('❌ 清除账户数据失败', 'error');
                }
            }
        });

        // 按钮悬停效果
        [startBtn, stopBtn, exportBtn, clearStateBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'scale(1.05)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'scale(1)';
                });
            }
        });

        // 根据保存的状态恢复按钮显示
        if (isAutoRegistering) {
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
        } else {
            if (startBtn) startBtn.style.display = 'inline-block';
            if (stopBtn) stopBtn.style.display = 'none';
        }

        // 恢复状态显示
        updateRegistrationStatus();

        return {
            log: function(message, type = 'info') {
                const logEntry = document.createElement('div');
                logEntry.style.marginBottom = '10px';
                logEntry.style.padding = '12px';
                logEntry.style.borderRadius = '6px';
                logEntry.style.wordBreak = 'break-all';
                logEntry.style.transition = 'all 0.3s ease';

                let bgColor, textColor;

                switch(type) {
                    case 'success':
                        bgColor = 'rgba(46, 204, 113, 0.2)';
                        textColor = COLORS.secondary;
                        break;
                    case 'error':
                        bgColor = 'rgba(231, 76, 60, 0.2)';
                        textColor = COLORS.danger;
                        break;
                    case 'warning':
                        bgColor = 'rgba(243, 156, 17, 0.2)';
                        textColor = COLORS.warning;
                        break;
                    default:
                        bgColor = 'rgba(255, 255, 255, 0.05)';
                        textColor = COLORS.light;
                }

                logEntry.style.backgroundColor = bgColor;
                logEntry.style.color = textColor;

                const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' });
                logEntry.textContent = `[${time}] ${message}`;
                logContent.appendChild(logEntry);
                logContent.scrollTop = logContent.scrollHeight;
            }
        };
    }

    // 创建全局日志对象
    const logger = createLogUI();

    // 生成随机邮箱
    function generateEmail() {
        const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        const timestamp = Date.now().toString(36); // 转换为36进制以缩短长度
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // 生成4位随机数
        const username = `${firstName}${lastName}${timestamp}${randomNum}`;
        return `${username}${EMAIL_DOMAIN}`;
    }



    // 删除邮件
    async function deleteEmail(firstId) {
        return new Promise((resolve, reject) => {
            const deleteUrl = 'https://tempmail.plus/api/mails/';
            const maxRetries = 5;
            let retryCount = 0;

            function tryDelete() {
                GM_xmlhttpRequest({
                    method: "DELETE",
                    url: deleteUrl,
                    data: `email=${TEMP_MAIL_CONFIG.username}${TEMP_MAIL_CONFIG.emailExtension}&first_id=${firstId}&epin=${TEMP_MAIL_CONFIG.epin}`,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    onload: function(response) {
                        try {
                            const result = JSON.parse(response.responseText).result;
                            if (result === true) {
                                logger.log("邮件删除成功", 'success');
                                resolve(true);
                                return;
                            }
                        } catch (error) {
                            logger.log("解析删除响应失败: " + error, 'warning');
                        }

                        // 如果还有重试次数，继续尝试
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            logger.log(`删除邮件失败，正在重试 (${retryCount}/${maxRetries})...`, 'warning');
                            setTimeout(tryDelete, 500);
                        } else {
                            logger.log("删除邮件失败，已达到最大重试次数", 'error');
                            resolve(false);
                        }
                    },
                    onerror: function(error) {
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            logger.log(`删除邮件出错，正在重试 (${retryCount}/${maxRetries})...`, 'warning');
                            setTimeout(tryDelete, 500);
                        } else {
                            logger.log("删除邮件失败: " + error, 'error');
                            resolve(false);
                        }
                    }
                });
            }

            tryDelete();
        });
    }

    // 获取最新邮件中的验证码
    async function getLatestMailCode() {
        return new Promise((resolve, reject) => {
            const mailListUrl = `https://tempmail.plus/api/mails?email=${TEMP_MAIL_CONFIG.username}${TEMP_MAIL_CONFIG.emailExtension}&limit=20&epin=${TEMP_MAIL_CONFIG.epin}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: mailListUrl,
                onload: async function(mailListResponse) {
                    try {
                        const mailListData = JSON.parse(mailListResponse.responseText);
                        if (!mailListData.result || !mailListData.first_id) {
                            resolve(null);
                            return;
                        }

                        const firstId = mailListData.first_id;
                        const mailDetailUrl = `https://tempmail.plus/api/mails/${firstId}?email=${TEMP_MAIL_CONFIG.username}${TEMP_MAIL_CONFIG.emailExtension}&epin=${TEMP_MAIL_CONFIG.epin}`;

                        GM_xmlhttpRequest({
                            method: "GET",
                            url: mailDetailUrl,
                            onload: async function(mailDetailResponse) {
                                try {
                                    const mailDetailData = JSON.parse(mailDetailResponse.responseText);
                                    if (!mailDetailData.result) {
                                        resolve(null);
                                        return;
                                    }

                                    const mailText = mailDetailData.text || "";
                                    const mailSubject = mailDetailData.subject || "";
                                    logger.log("找到邮件主题: " + mailSubject);

                                    const code = extractVerificationCode(mailText);

                                    // 获取到验证码后，尝试删除邮件
                                    if (code) {
                                        await deleteEmail(firstId);
                                    }

                                    resolve(code);
                                } catch (error) {
                                    logger.log("解析邮件详情失败: " + error, 'error');
                                    resolve(null);
                                }
                            },
                            onerror: function(error) {
                                logger.log("获取邮件详情失败: " + error, 'error');
                                resolve(null);
                            }
                        });
                    } catch (error) {
                        logger.log("解析邮件列表失败: " + error, 'error');
                        resolve(null);
                    }
                },
                onerror: function(error) {
                    logger.log("获取邮件列表失败: " + error, 'error');
                    resolve(null);
                }
            });
        });
    }

    // 获取验证码（带重试机制）
    async function getVerificationCode(maxRetries = 5, retryInterval = 3000) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            logger.log(`尝试获取验证码 (第 ${attempt + 1}/${maxRetries} 次)...`);

            try {
                const code = await getLatestMailCode();
                if (code) {
                    logger.log("成功获取验证码: " + code, 'success');
                    return code;
                }

                if (attempt < maxRetries - 1) {
                    logger.log(`未获取到验证码，${retryInterval/1000}秒后重试...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, retryInterval));
                }
            } catch (error) {
                logger.log("获取验证码出错: " + error, 'error');
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, retryInterval));
                }
            }
        }

        throw new Error(`经过 ${maxRetries} 次尝试后仍未获取到验证码。`);
    }



    // 处理人机验证
    async function handleHumanVerification() {
        logger.log('等待人机验证出现...', 'info');

        let verifyCheckbox = null;
        let waitTime = 7;
        
        for (let i = 0; i < waitTime; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 首先检查是否已经验证成功
            const successText = Array.from(document.querySelectorAll('*')).find(el =>
                el.textContent && el.textContent.includes('Success!')
            );

            if (successText && successText.offsetParent !== null) {
                logger.log('人机验证已完成', 'success');
                return true;
            }

            // 检查是否有人机验证复选框
            verifyCheckbox = document.querySelector('input[type="checkbox"]');

            if (verifyCheckbox) {
                logger.log('发现人机验证复选框', 'info');
                break;
            }

            logger.log(`等待人机验证出现... (${i + 1}/${waitTime}秒)`, 'info');
        }

        if (!verifyCheckbox) {
            logger.log('未发现人机验证要求，可能已经通过或不需要验证', 'info');
            return true;
        }

        // 点击人机验证复选框
        logger.log('点击人机验证复选框...', 'info');
        verifyCheckbox.click();

        // 等待验证完成，最多等待60秒
        for (let i = 0; i < 60; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 检查是否在验证中
            const verifyingText = document.querySelector('#verifying-text');
            if (verifyingText && verifyingText.textContent.includes('Verifying')) {
                logger.log(`人机验证中... (${i + 1}/60秒)`, 'info');
                continue;
            }

            // 检查是否验证成功
            const successText = Array.from(document.querySelectorAll('*')).find(el =>
                el.textContent && el.textContent.includes('Success!')
            );

            if (successText && successText.textContent.includes('Success!')) {
                if (successText.offsetParent !== null) {
                    logger.log('✅ 人机验证成功！检测到Success!标志', 'success');
                    return true;
                } else {
                    logger.log('Success!文本存在但不可见，继续等待...', 'info');
                }
            }

            // 检查是否验证失败或需要重新验证
            const newCheckbox = document.querySelector('input[type="checkbox"]');
            if (newCheckbox && !newCheckbox.checked) {
                logger.log('验证失败，需要重新验证', 'warning');
                newCheckbox.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
        }

        // 最终检查验证状态
        const finalSuccessText = Array.from(document.querySelectorAll('*')).find(el =>
            el.textContent && el.textContent.includes('Success!')
        );

        if (finalSuccessText && finalSuccessText.offsetParent !== null) {
            logger.log('人机验证最终成功！检测到Success!文本', 'success');
            return true;
        }

        logger.log('人机验证超时或失败 - 未检测到Success!标志', 'error');
        return false;
    }

    // 检测注册成功并保存信息
    async function checkRegistrationSuccess() {
        logger.log('等待注册结果...', 'info');

        // 等待最多30秒检测注册结果
        for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 检测错误信息
            const errorElements = document.querySelectorAll('.error, .alert-danger, [role="alert"], .rt-Text[color="red"]');
            if (errorElements.length > 0) {
                const errorText = Array.from(errorElements).map(el => el.textContent.trim()).join('; ');
                logger.log('❌ 注册失败：' + errorText, 'error');
                return false;
            }

            // 检测成功标志：页面跳转到subscription页面
            if (window.location.href.includes('app.augmentcode.com/account/subscription')) {
                logger.log('✅ 注册成功！已跳转到subscription页面', 'success');
                return true;
            }
        }

        logger.log('⏳ 注册状态检测超时，请手动检查', 'warning');
        return false;
    }



    // ==================== 主流程控制函数 ====================

    // 执行完整的注册流程
    async function executeFullRegistration() {
        logger.log('🚀 开始执行完整注册流程', 'info');

        try {
            // 检查是否已停止注册
            if (!isAutoRegistering) {
                logger.log('⏹️ 注册已停止，终止流程', 'warning');
                return false;
            }

            // 第一步：处理邮箱输入和人机验证
            logger.log('📧 步骤1：处理邮箱输入页面', 'info');
            const firstPageResult = await handleFirstPage();
            if (!firstPageResult) {
                logger.log('❌ 第一页面处理失败', 'error');
                return false;
            }

            // 检查是否已停止注册
            if (!isAutoRegistering) {
                logger.log('⏹️ 注册已停止，终止流程', 'warning');
                return false;
            }

            // 等待页面跳转到验证码页面
            logger.log('⏳ 等待跳转到验证码页面...', 'info');
            await waitForPageTransition('input[name="code"]', 10000);

            // 检查是否已停止注册
            if (!isAutoRegistering) {
                logger.log('⏹️ 注册已停止，终止流程', 'warning');
                return false;
            }

            // 第二步：处理验证码输入
            logger.log('🔢 步骤2：处理验证码输入页面', 'info');
            const secondPageResult = await handleSecondPage();
            if (!secondPageResult) {
                logger.log('❌ 第二页面处理失败或遇到注册被拒绝', 'warning');

                // 如果是持续注册模式且遇到注册被拒绝，等待一下后重新开始
                if (isAutoRegistering) {
                    logger.log('🔄 持续注册模式：等待5秒后重新开始注册流程...', 'info');
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    // 检查是否已经跳转到注册页面
                    if (document.querySelector('input[name="username"]') ||
                        window.location.href.includes('login.augmentcode.com')) {
                        logger.log('🔄 已返回注册页面，重新开始注册流程', 'info');
                        return await executeFullRegistration(); // 递归重新开始
                    }
                }
                return false;
            }

            // 等待页面跳转到成功页面
            logger.log('⏳ 等待跳转到成功页面...', 'info');
            await waitForPageTransition('app.augmentcode.com/account/subscription', 15000);

            // 检查是否已停止注册
            if (!isAutoRegistering) {
                logger.log('⏹️ 注册已停止，终止流程', 'warning');
                return false;
            }

            // 第三步：处理成功页面
            logger.log('🎉 步骤3：处理成功页面', 'info');
            const thirdPageResult = await handleThirdPage();
            if (!thirdPageResult) {
                logger.log('❌ 第三页面处理失败', 'error');
                return false;
            }

            logger.log('✅ 完整注册流程执行成功！', 'success');
            return true;

        } catch (error) {
            logger.log(`❌ 注册流程执行出错: ${error}`, 'error');
            return false;
        }
    }



    // 主函数 - 只负责页面检测和路由
    async function main() {
        logger.log('🔍 检测当前页面类型...', 'info');

        // 检测第三页面：成功页面
        if (window.location.href.includes('app.augmentcode.com/account/subscription')) {
            logger.log('📄 检测到第三页面：成功页面', 'info');
            if (isAutoRegistering) {
                await handleThirdPage();
            }
            return;
        }

        // 检测第二页面：验证码输入页面
        const emailSentText = Array.from(document.querySelectorAll('*')).find(el =>
            el.textContent && el.textContent.includes("We've sent an email with your code to")
        );
        if (document.querySelector('input[name="code"]') || emailSentText) {
            logger.log('📄 检测到第二页面：验证码输入页面', 'info');
            if (emailSentText) {
                const emailMatch = emailSentText.textContent.match(/to\s+([^\s]+@[^\s]+)/);
                if (emailMatch) {
                    logger.log(`📧 验证码已发送到: ${emailMatch[1]}`, 'info');
                }
            }
            if (isAutoRegistering) {
                await handleSecondPage();
            }
            return;
        }

        // 检测注册被拒绝页面
        const rejectedText = Array.from(document.querySelectorAll('*')).find(el =>
            el.textContent && el.textContent.includes('Sign-up rejected')
        );
        if (rejectedText) {
            logger.log('📄 检测到注册被拒绝页面', 'warning');
            if (isAutoRegistering) {
                logger.log('🔄 持续注册模式：自动处理注册被拒绝', 'info');
                await handleSignupRejectedPage();
            } else {
                logger.log('💡 检测到注册被拒绝，请手动点击重试链接', 'warning');
            }
            return;
        }

        // 检测第一页面：邮箱输入页面
        const googleButton = Array.from(document.querySelectorAll('button')).find(btn =>
            btn.textContent && btn.textContent.includes('Continue with Google')
        );
        if (document.querySelector('input[name="username"]') || googleButton) {
            logger.log('📄 检测到第一页面：邮箱输入页面', 'info');
            if (googleButton) {
                logger.log('🔍 检测到Google登录按钮，确认为注册页面', 'info');
            }

            if (isAutoRegistering) {
                logger.log('🔄 持续注册模式：自动开始注册流程', 'info');
                await executeFullRegistration();
            } else {
                logger.log('💡 请点击"开始持续注册"按钮来启动自动注册', 'info');
            }
            return;
        }

        // 检测是否在注册相关页面
        if (!window.location.href.includes('login.augmentcode.com') &&
            !window.location.href.includes('auth.augmentcode.com')) {
            logger.log('⚠️ 当前页面不是注册页面，脚本不执行', 'warning');
            return;
        }

        logger.log('❓ 无法识别当前页面状态，等待页面加载...', 'warning');
    }

    // 处理第三页面：成功页面（subscription页面）
    async function handleThirdPage() {
        logger.log('检测到subscription页面，开始提取账户信息...', 'info');

        try {
            // 等待页面元素加载完成
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 提取额度信息
            let credits = '0';
            const creditElement = document.querySelector('span.rt-Text.rt-r-size-5.rt-r-weight-medium');

            if (creditElement) {
                // 获取初始值
                const initialText = creditElement.textContent.trim();
                const initialMatch = initialText.match(/(\d+)/);
                const initialCredits = initialMatch ? initialMatch[1] : '0';

                // 等待几秒看是否有变化
                await new Promise(resolve => setTimeout(resolve, 3000));

                // 获取更新后的值
                const updatedText = creditElement.textContent.trim();
                const updatedMatch = updatedText.match(/(\d+)/);
                const updatedCredits = updatedMatch ? updatedMatch[1] : '0';

                // 如果有变化就用新值，否则用初始值
                credits = updatedCredits !== initialCredits ? updatedCredits : initialCredits;
                logger.log(`检测到账户额度: ${credits}`, 'success');
            } else {
                logger.log('未找到额度信息元素', 'warning');
            }

            // 提取邮箱信息
            const emailElement = document.querySelector('[data-testid="user-email"]');
            let email = '';
            if (emailElement) {
                email = emailElement.textContent.trim();
                logger.log(`检测到注册邮箱: ${email}`, 'success');
            } else {
                logger.log('未找到邮箱信息元素', 'warning');
            }

            // 保存账户信息
            if (email) {
                const accountInfo = {
                    email: email,
                    credits: credits,
                    registeredAt: new Date().toISOString()
                };
                registeredAccounts.push(accountInfo);
                registrationCount++;

                // 保存状态到本地存储
                saveState();

                // 更新UI显示
                updateRegistrationStatus();

                logger.log(`账户信息已保存: ${email} (额度: ${credits})`, 'success');
            }

            // 检查是否已停止注册
            if (!isAutoRegistering) {
                logger.log('⏹️ 注册已停止，不执行退出登录', 'warning');
                return true;
            }

            // 等待一下再点击退出登录
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 再次检查是否已停止注册
            if (!isAutoRegistering) {
                logger.log('⏹️ 注册已停止，不执行退出登录', 'warning');
                return true;
            }

            // 点击退出登录按钮
            const logoutBtn = document.querySelector('[data-testid="logout-button"]');
            if (logoutBtn) {
                logoutBtn.click();
                logger.log('已点击退出登录按钮', 'success');

                // 等待页面跳转
                await new Promise(resolve => setTimeout(resolve, 3000));

                // 最终检查是否还在持续注册模式
                if (isAutoRegistering) {
                    logger.log('准备开始下一轮注册...', 'info');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    logger.log('⏹️ 注册已停止，不继续下一轮', 'warning');
                }
            } else {
                logger.log('未找到退出登录按钮', 'error');
            }

        } catch (error) {
            logger.log('处理subscription页面时出错: ' + error, 'error');
        }
    }

    // ==================== UI控制和状态管理函数 ====================

    // 开始持续注册
    function startContinuousRegistration() {
        isAutoRegistering = true;
        saveState(); // 保存状态到本地存储
        updateRegistrationStatus();
        logger.log('🚀 开始持续注册模式', 'success');

        // 更新按钮状态
        const startBtn = document.getElementById('start-continuous-registration');
        const stopBtn = document.getElementById('stop-registration');
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-block';

        // 如果当前不在注册页面，自动跳转到注册页面
        if (!window.location.href.includes('login.augmentcode.com') &&
            !window.location.href.includes('auth.augmentcode.com') &&
            !window.location.href.includes('app.augmentcode.com/account/subscription')) {
            logger.log('🔄 跳转到注册页面开始持续注册...', 'info');
            window.location.href = 'https://login.augmentcode.com/signup';
        } else {
            // 如果已经在相关页面，立即开始执行
            logger.log('📍 已在相关页面，立即开始执行注册流程...', 'info');
            setTimeout(() => {
                executeFullRegistration().catch(error => {
                    logger.log('注册流程执行出错: ' + error, 'error');
                });
            }, 1000);
        }
    }

    // 停止持续注册
    function stopContinuousRegistration() {
        isAutoRegistering = false;
        saveState(); // 保存状态到本地存储
        updateRegistrationStatus();
        logger.log('已停止持续注册模式', 'warning');

        // 更新按钮状态
        const startBtn = document.getElementById('start-continuous-registration');
        const stopBtn = document.getElementById('stop-registration');
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
    }

    // 更新注册状态显示
    function updateRegistrationStatus() {
        const statusText = document.getElementById('status-text');
        const accountCount = document.getElementById('account-count');

        if (statusText) {
            statusText.textContent = isAutoRegistering ? '持续注册中' : '已停止';
        }
        if (accountCount) {
            accountCount.textContent = registrationCount;
        }
    }

    // 导出账户信息
    function exportAccounts() {
        if (registeredAccounts.length === 0) {
            logger.log('没有可导出的账户信息', 'warning');
            return;
        }

        // 生成导出内容
        let exportContent = '';
        registeredAccounts.forEach(account => {
            exportContent += `${account.email}\n${account.credits}\n\n`;
        });

        // 创建下载链接
        const blob = new Blob([exportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `augmentcode_accounts_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        logger.log(`已导出 ${registeredAccounts.length} 个账户信息`, 'success');
    }



    // ==================== 页面处理函数 ====================

    // 处理第一页面：邮箱输入和人机验证
    async function handleFirstPage() {
        logger.log('开始处理第一页面：邮箱输入和人机验证', 'info');

        // 1. 检查并填写邮箱
        const emailInput = await waitForElement('input[name="username"]');
        if (!emailInput) {
            logger.log('未找到邮箱输入框', 'error');
            return false;
        }

        // 检查邮箱是否已经预填充（注册被拒后重试的情况）
        const existingEmail = emailInput.value.trim();
        if (existingEmail) {
            logger.log(`检测到预填充邮箱: ${existingEmail}`, 'info');
            logger.log('跳过邮箱填写，使用预填充的邮箱', 'success');
        } else {
            // 没有预填充邮箱，生成新邮箱
            const email = generateEmail();
            logger.log('使用邮箱: ' + email);

            logger.log('找到邮箱输入框，开始填写');
            emailInput.value = email;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            logger.log('邮箱填写完成', 'success');
        }

        // 2. 等待并处理人机验证
        logger.log('开始处理人机验证流程...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const verificationResult = await handleHumanVerification();
        if (!verificationResult) {
            logger.log('人机验证失败，等待5秒后重试...', 'warning');
            await new Promise(resolve => setTimeout(resolve, 5000));

            const retryResult = await handleHumanVerification();
            if (!retryResult) {
                logger.log('人机验证重试失败，停止当前注册流程', 'error');
                return false;
            }
        }

        // 3. 人机验证成功后，点击继续按钮
        const continueBtn = await waitForElement('button[type="submit"]');
        if (!continueBtn) {
            logger.log('未找到继续按钮', 'error');
            return false;
        }

        logger.log('人机验证完成，点击继续按钮');
        continueBtn.click();

        logger.log('第一页面处理完成', 'success');
        return true;
    }

    // 处理第二页面：验证码输入
    async function handleSecondPage() {
        logger.log('开始处理第二页面：验证码输入', 'info');

        // 1. 获取验证码
        const code = await getVerificationCode();
        if (!code) {
            logger.log('未能获取验证码', 'error');
            return false;
        }

        // 2. 填写验证码
        const codeInput = await waitForElement('input[name="code"]');
        if (!codeInput) {
            logger.log('未找到验证码输入框', 'error');
            return false;
        }

        logger.log('找到验证码输入框，开始填写');
        codeInput.value = code;
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
        logger.log('验证码填写完成', 'success');

        // 3. 点击继续按钮
        const continueBtn = await waitForElement('button[type="submit"]');
        if (!continueBtn) {
            logger.log('未找到继续按钮', 'error');
            return false;
        }

        logger.log('点击继续按钮');
        continueBtn.click();

        // 4. 等待并检测注册结果
        logger.log('等待注册完成...', 'info');
        await new Promise(resolve => setTimeout(resolve, 3000)); // 等待页面响应

        // 检查是否出现注册被拒绝页面
        if (await handleSignupRejectedPage()) {
            logger.log('检测到注册被拒绝，已处理重试', 'warning');
            return false; // 返回false表示需要重新开始流程
        }

        // 检测注册成功
        await checkRegistrationSuccess();

        logger.log('第二页面处理完成', 'success');
        return true;
    }

    // 处理注册被拒绝页面
    async function handleSignupRejectedPage() {
        logger.log('检查是否出现注册被拒绝页面...', 'info');

        // 检测页面是否包含"Sign-up rejected"文本
        const rejectedText = Array.from(document.querySelectorAll('*')).find(el =>
            el.textContent && el.textContent.includes('Sign-up rejected')
        );

        if (rejectedText) {
            logger.log('⚠️ 检测到注册被拒绝页面', 'warning');

            // 查找"Try again here"链接
            const tryAgainLink = document.querySelector('a[href*="/login"]');
            if (tryAgainLink) {
                logger.log('找到重试链接，正在点击...', 'info');
                tryAgainLink.click();

                // 等待页面跳转
                await new Promise(resolve => setTimeout(resolve, 3000));
                logger.log('已点击重试链接，页面将跳转到注册页面', 'success');
                return true; // 返回true表示处理了拒绝页面
            } else {
                logger.log('未找到重试链接', 'error');
                return false;
            }
        }

        return false; // 没有检测到拒绝页面
    }

    // 启动脚本
    main().catch(error => logger.log('脚本执行出错: ' + error, 'error'));
})();