// ==MiruExtension==
// @name         Cinemana VIP
// @version      v3.0.0
// @author       Anonymous
// @lang         ar
// @license      MIT
// @icon         https://cinemana.vip/wp-content/uploads/2024/01/favicon.png
// @package      cinemana.vip
// @type         video
// @webSite      https://cinemana.vip
// ==/MiruExtension==

const BASE_URL = "https://cinemana.vip";
const API_URL = `${BASE_URL}/wp-json/wp/v2`;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

async function fetchJson(url) {
    const res = await fetch(url, { 
        headers: { "User-Agent": USER_AGENT },
        credentials: "include"
    });
    return res.json();
}

async function fetchHtml(url) {
    const res = await fetch(url, { 
        headers: { "User-Agent": USER_AGENT },
        credentials: "include"
    });
    return res.text();
}

async function getCategories() {
    return [
        { id: 0, name: "أحدث المقالات" },
        { id: 42442, name: "مسلسلات" },
        { id: 74261, name: "أفلام" },
        { id: 74260, name: "أنمي" }
    ];
}

async function fetchPosts(categoryId = 0, page = 1, query = "") {
    let url = `${API_URL}/posts?per_page=20&page=${page}&orderby=date&order=desc&_embed`;
    if (categoryId !== 0) url += `&categories=${categoryId}`;
    if (query) url += `&search=${encodeURIComponent(query)}`;
    const posts = await fetchJson(url);
    return posts.map(post => ({
        title: decodeEntities(post.title.rendered),
        description: cleanText(post.excerpt.rendered),
        thumbnail: extractThumbnail(post),
        url: post.link,
        id: post.id
    }));
}

function decodeEntities(encodedString) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
}

function cleanText(html) {
    return html.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

function extractThumbnail(post) {
    return (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) || "https://via.placeholder.com/300x450?text=Cinemana";
}

function extractThumbnailFromHtml(html) {
    const match = /<meta property="og:image" content="(.*?)"/i.exec(html);
    return match ? match[1] : "https://via.placeholder.com/300x450?text=Cinemana";
}

async function loadPostDetail(url) {
    const html = await fetchHtml(url);

    const title = (/<title>(.*?)<\/title>/i.exec(html) || [])[1]?.trim() || "بدون عنوان";
    const description = (/<meta name="description" content="(.*?)"/i.exec(html) || [])[1]?.trim() || "";
    const thumbnail = extractThumbnailFromHtml(html);

    const videos = [];
    const iframeMatches = [...html.matchAll(/<iframe[^>]+src=["'](.*?)["']/g)];
    iframeMatches.forEach(match => {
        const src = match[1];
        if (src.includes("player") || src.includes("embed") || src.includes("video")) {
            videos.push({
                title: extractServerName(src),
                url: src,
                type: "embed"
            });
        }
    });

    return { title, description, thumbnail, videos };
}

function extractServerName(url) {
    try {
        const domain = (new URL(url)).hostname.replace("www.", "");
        return `مشاهدة عبر: ${domain}`;
    } catch (e) {
        return "مشاهدة";
    }
}

export default {
    id: "cinemana-vip",
    name: "Cinemana VIP",
    version: "3.0.0",
    icon: "https://cinemana.vip/wp-content/uploads/2024/01/favicon.png",
    description: "مشاهدة وتحميل المسلسلات والأفلام والأنمي مجاناً من موقع Cinemana.vip.",
    async popular(page) {
        return await fetchPosts(0, page);
    },
    async latest(page) {
        return await fetchPosts(0, page);
    },
    async search(query) {
        return await fetchPosts(0, 1, query);
    },
    async categories() {
        return await getCategories();
    },
    async category(categoryId, page) {
        return await fetchPosts(categoryId, page);
    },
    async item(url) {
        const detail = await loadPostDetail(url);
        return {
            title: detail.title,
            description: detail.description,
            thumbnail: detail.thumbnail,
            episodes: detail.videos.map((video, idx) => ({
                title: video.title || `مشاهدة ${idx + 1}`,
                url: video.url,
                type: video.type
            }))
        };
    }
};
