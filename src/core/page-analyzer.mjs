import { chromium } from "@playwright/test";

export class PageAnalyzer {
	constructor() {
		this.browser = null;
	}

	async initialize() {
		this.browser = await chromium.launch({
			channel: "msedge",
			headless: true,
		});
	}

	async analyze(url) {
		if (!this.browser) {
			throw new Error("Browser not initialized");
		}

		const page = await this.browser.newPage();

		try {
			await page.goto(url);

			await page.emulateMedia({ reducedMotion: "reduce" });

			//スクリーンショットを撮影
			const screenshot = await page.screenshot({ fullPage: true });

			const analysis = await page.evaluate(() => {
				function getSoundAttributes() {
					const soundEl = document.getElementById("soundsection");
					if (!soundEl) {
						return {};
					}

					return Array.from(soundEl.attributes).reduce((acc, attr) => {
						acc[attr.name] = attr.value;
						return acc;
					}, {});
				}

				function getElementAttributes(selector, attribute) {
					const elements = document.querySelectorAll(selector);

					return Array.from(elements).reduce((acc, element, index) => {
						acc[index + 1] = element.getAttribute(attribute);
						return acc;
					}, {});
				}

				const CSS_PROPERTIES = [
					"color",
					"font-size",
					"font-family",
					"background-color",
					"background-image",
					"display",
					"visibility",
					"position",
					"width",
					"height",
					"border-radius",
					"z-index",
				];

				function extractNode(element, depth = 1, elements = []) {
					const rect = element.getBoundingClientRect();

					const inlineStyles = {};

					for (const key of element.style) {
						inlineStyles[key] = element.style[key];
					}

					function rgbToHex(rgb) {
						const result = rgb.match(/\d+/g);
						if (result) {
							return `${(
								(1 << 24) +
								(+result[0] << 16) +
								(+result[1] << 8) +
								+result[2]
							)
								.toString(16)
								.slice(1)
								.toUpperCase()}`;
						}
					}

					function cleanFontFamily(font) {
						return font.replace(/"/g, "");
					}

					function formatBackgroundImageValue(value) {
						if (!value || value.match(/none/i)) {
							return "";
						}

						const urlRegex = /url\(([^)]+)\)/g;
						let match;
						const files = [];
						let index = 1;

						// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
						while ((match = urlRegex.exec(value)) !== null) {
							const url = match[1].trim().replace(/["']/g, "");
							const fileName = url.split("/").pop();
							files.push(`(${index}) ${fileName}`);
							index++;
						}

						return files.length > 0 ? files.join(", ") : value;
					}

					const getCleanStyleProperties = (element) => {
						const computedStyle = window.getComputedStyle(element);

						const styles = {
							computed: {},
							inline: element.style.cssText,
						};

						// biome-ignore lint/complexity/noForEach: <explanation>
						CSS_PROPERTIES.forEach((property) => {
							const inlineValue = element.style.getPropertyValue(property);

							if (inlineValue) {
								styles.computed[property] = inlineValue;
							} else {
								const computedValue = computedStyle.getPropertyValue(property);
								if (
									computedValue &&
									computedValue !== "initial" &&
									computedValue !== "none"
								) {
									let value = computedValue;
									if (["color", "background-color"].includes(property)) {
										value = rgbToHex(computedValue);
									}
									if (property === "background-image") {
										value = formatBackgroundImageValue(computedValue);
									}
									if (property === "font-family") {
										value = cleanFontFamily(computedValue);
									}
									styles.computed[property] = value;
								}
							}
						});
						return styles;
					};

					const size = {
						width: Math.floor(rect.width),
						height: Math.floor(rect.height),
					};

					const dimension = {
						x: Math.floor(rect.x),
						y: Math.floor(rect.y),
					};

					const elementInfo = {
						tag: element.tagName.toLowerCase(),
						depth,
						size,
						dimension,
						styles: getCleanStyleProperties(element),
					};

					if (element.id) {
						elementInfo.id = element.id;
					}

					if (element.className) {
						elementInfo.classname = element.className.replace(/\s+/g, ",");
					}

					const otherAttributes = {};
					// biome-ignore lint/complexity/noForEach: <explanation>
					Array.from(element.attributes).forEach((attr) => {
						if (attr.name !== "id" && attr.name !== "class") {
							otherAttributes[attr.name] = attr.value;
						}
					});

					if (Object.keys(otherAttributes).length > 0) {
						elementInfo["other-attr"] = otherAttributes;
					}

					elements.push(elementInfo);

					for (const child of element.children) {
						extractNode(child, depth + 1, elements);
					}

					return elements;
				}

				return {
					pageInfo: {
						title: document.title,
					},

					sounds: getSoundAttributes(),
					stylesheets: getElementAttributes('link[rel="stylesheet"]', "href"),
					scripts: getElementAttributes("script[src]", "src"),
					elements: extractNode(document.body),
				};
			});
			return {
				analysis,
				screenshot,
			};
		} catch (error) {
			throw new Error(`Failed to analyze page: ${error.message}`);
		} finally {
			await page.close();
		}
	}
	async close() {
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}
}
