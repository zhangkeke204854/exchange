import os
import time
import random
import asyncio
from playwright.sync_api import sync_playwright
from playwright.async_api import async_playwright
from concurrent.futures import ThreadPoolExecutor, as_completed

# 获取当前文件的绝对路径（包含文件名）
current_path = os.path.realpath(__file__)

# 获取目录路径
file_dir = os.path.dirname(current_path)

# 配置代理（Playwright 方式）
proxy_settings = {'server': 'http://127.0.0.1:13659'}

user_agent = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 "
              "Safari/537.36")


async def create_browser(headless=True):
    """创建 Playwright 浏览器实例"""
    playwright = await async_playwright().start()

    # 启动浏览器，可以选择 chromium, firefox 或 webkit
    browser = await playwright.chromium.launch(
        headless=headless,
        # proxy=proxy_settings,  # Playwright 代理配置
        args=[
            '--disable-blink-features=AutomationControlled',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--ignore-certificate-errors',
            '--allow-running-insecure-content',
            '--disable-notifications',
            '--start-maximized'
        ]
    )

    # 创建上下文，类似无痕浏览器
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent=user_agent,
        ignore_https_errors=True
    )

    # 注入脚本隐藏自动化特征
    await context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };

        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    """)

    return playwright, browser, context


async def download_image_playwright(url_data):
    """
    使用 Playwright 下载单张图片
    """
    file_path, index, url = url_data
    file = os.path.join(file_path, f"{index}.png")

    download_flag = True
    playwright = None
    browser = None

    try:
        # 创建浏览器实例
        playwright, browser, context = await create_browser(headless=True)
        page = await context.new_page()

        # 设置超时和导航选项
        page.set_default_timeout(30000)

        # 导航到页面
        await page.goto(url, wait_until='load', timeout=100000)

        # 等待随机时间
        await asyncio.sleep(random.uniform(2.0, 3.0))

        # 等待元素存在于DOM中，而不一定可见
        await page.wait_for_selector('img', state='attached', timeout=60000)

        # 获取图片元素
        image_element = await page.query_selector('img')

        if image_element:
            # 方法1: 直接对图片元素截图 (推荐)
            await image_element.screenshot(path=file)
            print("成功下载 (元素截图):", url, file)
        else:
            print("未找到图片元素:", url)
            download_flag = False

    except Exception as e:
        print("下载失败:", url, e)
        download_flag = False

    finally:
        # 确保资源被正确关闭
        if browser:
            await browser.close()
        if playwright:
            await playwright.stop()

    return download_flag


async def download_image_wrapper(url_data):
    """
    包装函数用于在异步环境中运行
    """
    return await download_image_playwright(url_data)


def run_async_download(url_data):
    """
    在同步代码中运行异步函数
    """
    return asyncio.run(download_image_wrapper(url_data))


async def save_image_async(file_path, img_url_list, max_workers=2):
    """
    异步版本的图片保存函数
    """
    # 准备任务参数
    tasks = [(file_path, index, url) for index, url in enumerate(img_url_list)]

    success_count = 0
    completed_count = 0

    print(f"开始下载 {len(tasks)} 张图片，使用 {max_workers} 个并发 worker...")

    # 使用 Semaphore 控制并发数量
    semaphore = asyncio.Semaphore(max_workers)

    async def bounded_download(task):
        async with semaphore:
            result = await download_image_playwright(task)
            nonlocal completed_count, success_count
            completed_count += 1
            if result:
                success_count += 1
            print(f"进度: {completed_count}/{len(tasks)} - 成功: {success_count}")
            return result

    # 创建并执行所有任务
    download_tasks = [bounded_download(task) for task in tasks]
    results = await asyncio.gather(*download_tasks, return_exceptions=True)

    # 处理结果
    success_count = sum(1 for r in results if r is True)

    print(f"\n🎉 下载完成! 成功: {success_count}/{len(img_url_list)} 张")
    return success_count


def save_image(file_path, img_url_list, max_workers=2):
    """
    同步接口，内部使用异步 (兼容原有代码)
    """
    # 在同步函数中运行异步代码
    success_count = asyncio.run(save_image_async(file_path, img_url_list, max_workers))
    return success_count


# 同步版本的下载函数 (备用方案)
def download_image_sync(url_data):
    """
    同步版本的图片下载函数
    """
    file, url = url_data
    download_flag = True
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                # proxy=proxy_settings,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-gpu',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                ]
            )

            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent=user_agent,
                ignore_https_errors=True
            )

            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            """)

            page = context.new_page()

            page.goto(url, wait_until='load', timeout=10000)

            time.sleep(random.uniform(2.0, 3.0))

            # 等待并获取图片元素
            page.wait_for_selector('img', state='attached', timeout=5000)

            image_element = page.query_selector('img')

            if image_element:
                image_element.screenshot(path=file)
                print("成功下载:", url, file)
            else:
                print("未找到图片元素:", url)
                download_flag = False

            browser.close()

    except Exception as e:
        print("下载失败:", url, e)
        download_flag = False

    return download_flag


def save_image_sync(failed_urls, max_workers=10):
    """
    使用同步 Playwright API 的多线程下载
    """
    success_count = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_task = {
            executor.submit(download_image_sync, task): task
            for task in failed_urls
        }

        for future in as_completed(future_to_task):
            try:
                download_flag = future.result()
                if download_flag:
                    success_count += 1
            except Exception as e:
                print(f"任务执行异常: {e}")

    print(f"\n🎉 playwright请求下载完成! 图片总量: {len(failed_urls)} 张\n"
          f"成功: {success_count} 张\n失败: {len(failed_urls) - success_count} 张")


if __name__ == '__main__':
    temp_keyword = '文化大革命4'

    img_url_list = []

    record_file = os.path.join(file_dir, 'google_img_url3.csv')
    if os.path.exists(record_file):
        with open(record_file, "r", encoding="utf-8-sig") as r:
            read_lines = r.readlines()
            for each_line in read_lines:
                img_url_list.append(each_line.replace('\n', ''))

    file_path = os.path.join(file_dir, temp_keyword)

    # 创建保存图片的目录
    os.makedirs(file_path, exist_ok=True)

    failed_urls = [(os.path.join(file_path, f"{index}.png"), url) for index, url in enumerate(img_url_list)]

    # 使用方法1: 异步版本 (推荐)
    # save_image(file_path, img_url_list, max_workers=10)

    # 使用方法2: 同步版本 (备用)
    save_image_sync(failed_urls, max_workers=10)
