// src/lib/avatarColor.ts
//
// アイコン画像の色合いから、プロフィールのヘッダー背景に使う単色を生成する
// （Discord のバナーカラーのようなもの）。image-proxy.trap.jp は
// Access-Control-Allow-Origin: * を返すので、crossOrigin 指定で安全にピクセルを読める。

// 色抽出に使う正方形のサイズ（px）。ヒストグラムを取るので平均だけの
// ときより多めにサンプリングする。
const SAMPLE_SIZE = 32
// 色相を何分割してヒストグラムを取るか（15°刻み）。
const HUE_BUCKET_COUNT = 24
// この彩度未満のピクセルは「ほぼ無彩色」とみなし、色相の多数決に参加させない
// （白・黒・グレーの縁取りなどが多数決を勝ち取って灰色バナーになるのを防ぐ）。
const MIN_SATURATION_FOR_VOTE = 15

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value))

interface ColorSample {
    r: number
    g: number
    b: number
    /** 透明度に応じた重み（0〜1） */
    weight: number
}

/**
 * 画像 URL から、ヘッダー背景向けに調整した単色（CSS の hsl() 文字列）を生成する。
 * CORS で読めない・読み込みに失敗した等の場合は null を返す（呼び出し側で
 * フォールバックの背景色を使うこと）。
 */
export async function getAvatarAccentColor(imageUrl: string): Promise<string | null> {
    try {
        const image = await loadImage(imageUrl)
        const samples = collectSamples(image)
        const { r, g, b } = dominantColor(samples)
        const { h, s, l } = rgbToHsl(r, g, b)

        // 抽出した色そのままだと暗すぎ・薄すぎでバナーとして映えないことがあるので、
        // 色相はそのまま、彩度・明度だけ心地よい範囲へ寄せる。
        const bannerS = clamp(s, 50, 75)
        const bannerL = clamp(l, 40, 55)

        return `hsl(${Math.round(h)}, ${Math.round(bannerS)}%, ${Math.round(bannerL)}%)`
    } catch (error) {
        console.warn('アイコンからの色抽出に失敗:', error)
        return null
    }
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error(`画像の読み込みに失敗しました: ${url}`))
        image.src = url
    })
}

function collectSamples(image: HTMLImageElement): ColorSample[] {
    const canvas = document.createElement('canvas')
    canvas.width = SAMPLE_SIZE
    canvas.height = SAMPLE_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context を取得できません')

    ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

    const samples: ColorSample[] = []
    for (let i = 0; i < data.length; i += 4) {
        // ほぼ透明なピクセル（角丸の透過部分など）は除く
        const alpha = (data[i + 3] ?? 0) / 255
        if (alpha < 0.5) continue
        samples.push({ r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0, weight: alpha })
    }
    if (samples.length === 0) throw new Error('不透明なピクセルがありません')

    return samples
}

/**
 * 画素を色相ごとのヒストグラムに投票させ、最多得票の色相帯に属す画素だけを
 * 平均した「支配的な色」を返す。全体を1色に潰す単純平均と違い、複数の色が
 * 混ざって彩度の低い中間色になるのを避けられる。
 *
 * 投票に使えるだけの有彩色ピクセルが無い（アイコンがほぼモノクロ）場合は、
 * 全ピクセルの加重平均にフォールバックする。
 */
function dominantColor(samples: ColorSample[]): { r: number; g: number; b: number } {
    const buckets = Array.from({ length: HUE_BUCKET_COUNT }, () => ({
        weight: 0,
        rSum: 0,
        gSum: 0,
        bSum: 0,
    }))

    let votingWeight = 0
    for (const { r, g, b, weight } of samples) {
        const { h, s } = rgbToHsl(r, g, b)
        if (s < MIN_SATURATION_FOR_VOTE) continue

        const bucketIndex = Math.floor((h / 360) * HUE_BUCKET_COUNT) % HUE_BUCKET_COUNT
        const bucket = buckets[bucketIndex]!
        bucket.weight += weight
        bucket.rSum += r * weight
        bucket.gSum += g * weight
        bucket.bSum += b * weight
        votingWeight += weight
    }

    if (votingWeight === 0) {
        return weightedAverage(samples)
    }

    const winner = buckets.reduce((best, bucket) => (bucket.weight > best.weight ? bucket : best))
    return {
        r: winner.rSum / winner.weight,
        g: winner.gSum / winner.weight,
        b: winner.bSum / winner.weight,
    }
}

function weightedAverage(samples: ColorSample[]): { r: number; g: number; b: number } {
    let r = 0
    let g = 0
    let b = 0
    let weight = 0
    for (const sample of samples) {
        r += sample.r * sample.weight
        g += sample.g * sample.weight
        b += sample.b * sample.weight
        weight += sample.weight
    }
    return { r: r / weight, g: g / weight, b: b / weight }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const l = (max + min) / 2

    if (max === min) return { h: 0, s: 0, l: l * 100 }

    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    let h: number
    if (max === rn) {
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
    } else if (max === gn) {
        h = ((bn - rn) / d + 2) * 60
    } else {
        h = ((rn - gn) / d + 4) * 60
    }

    return { h, s: s * 100, l: l * 100 }
}
