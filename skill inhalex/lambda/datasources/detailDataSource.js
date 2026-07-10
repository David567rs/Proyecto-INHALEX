const util = require("../util");

function formatRatingStars(rating) {
  const safeRating =
    Number.isFinite(rating) && rating > 0
      ? rating
      : 0;

  const filledStars = Math.max(
    0,
    Math.min(5, Math.round(safeRating))
  );

  return (
    "★★★★★".slice(0, filledStars) +
    "☆☆☆☆☆".slice(0, 5 - filledStars)
  );
}

function formatBenefits(benefits) {
  const safeBenefits = Array.isArray(benefits)
    ? benefits
        .map(function (benefit) {
          if (typeof benefit === "string") {
            return benefit.trim();
          }

          if (benefit && typeof benefit === "object") {
            return String(
              benefit.text ||
              benefit.name ||
              benefit.nombre ||
              ""
            ).trim();
          }

          return "";
        })
        .filter(Boolean)
    : [];

  const formattedBenefits = safeBenefits
    .slice(0, 3)
    .map(function (benefitText) {
      return {
        text: benefitText
      };
    });

  if (formattedBenefits.length === 0) {
    return [
      {
        text: "Producto natural"
      }
    ];
  }

  return formattedBenefits;
}

function createSlug(text) {
  if (typeof util.makeSlug === "function") {
    return util.makeSlug(text);
  }

  return String(text || "producto-inhalex")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function detailDataSource(product, quantity) {
  const safeProduct =
    product && typeof product === "object"
      ? product
      : {};

  const stockValue = Number(
    safeProduct.stockAvailable || 0
  );

  const stock = Number.isFinite(stockValue)
    ? stockValue
    : 0;

  const ratingValue = Number(
    safeProduct.rating
  );

  const safeRating =
    Number.isFinite(ratingValue) &&
    ratingValue > 0
      ? Number(ratingValue.toFixed(1))
      : 4.8;

  const reviewsValue = Number(
    safeProduct.reviews || 0
  );

  const safeReviews =
    Number.isFinite(reviewsValue) &&
    reviewsValue >= 0
      ? reviewsValue
      : 0;

  const titleText =
    safeProduct.name ||
    "Producto INHALEX";

  const descriptionText =
    safeProduct.description ||
    safeProduct.longDescription ||
    "Producto natural de INHALEX pensado para acompañar tu bienestar.";

  const image =
    safeProduct.detailImage ||
    safeProduct.image ||
    util.LOGO_URL;

  const category =
    safeProduct.categoryTitle ||
    util.getLineTitle(safeProduct.category) ||
    "Línea INHALEX";

  const categoryLabel =
    String(category).toUpperCase();

  const numericPrice = Number(
    safeProduct.price || 0
  );

  const price =
    Number.isFinite(numericPrice)
      ? numericPrice.toFixed(2)
      : "0.00";

  const currency =
    safeProduct.currency ||
    "MXN";

  const presentation =
    safeProduct.presentation ||
    "10 ml";

  const originText =
    String(
      safeProduct.origin ||
      "100% natural"
    ).toUpperCase();

  const requestedQuantity = Number(
    quantity
  );

  const safeQuantity =
    Number.isFinite(requestedQuantity) &&
    requestedQuantity > 0
      ? Math.max(
          1,
          Math.round(requestedQuantity)
        )
      : 1;

  const generatedSlug =
    createSlug(titleText);

  const productId =
    safeProduct.id ||
    safeProduct.slug ||
    generatedSlug;

  const productSlug =
    safeProduct.slug ||
    safeProduct.id ||
    generatedSlug;

  const available =
    stock > 0;

  const statusText =
    available
      ? "Disponible"
      : "Agotado";

  const ratingStars =
    formatRatingStars(safeRating);

  const reviewsText =
    "(" + safeReviews + ")";

  const benefits =
    formatBenefits(safeProduct.benefits);

  const benefitOneText =
    benefits[0]
      ? benefits[0].text
      : "";

  const benefitTwoText =
    benefits[1]
      ? benefits[1].text
      : "";

  const benefitThreeText =
    benefits[2]
      ? benefits[2].text
      : "";

  return {
    detailData: {
      type: "object",

      titleText: titleText,
      descriptionText: descriptionText,
      image: image,

      categoryLabel: categoryLabel,
      presentationText: presentation,
      originText: originText,

      available: available,
      statusText: statusText,

      rating: safeRating,
      ratingStars: ratingStars,
      reviews: safeReviews,
      reviewsText: reviewsText,

      price: price,
      priceText: "$" + price,
      currencyText: currency,

      quantity: safeQuantity,
      quantityText: String(safeQuantity),

      productId: productId,
      productSlug: productSlug,

      benefits: benefits,
      benefitOneText: benefitOneText,
      benefitTwoText: benefitTwoText,
      benefitThreeText: benefitThreeText,

      product: {
        id: productId,
        slug: productSlug,

        name: titleText,
        description: descriptionText,
        image: image,

        category: category,
        categoryLabel: categoryLabel,

        available: available,
        statusText: statusText,

        rating: safeRating,
        ratingStars: ratingStars,
        reviews: safeReviews,

        benefits: benefits,

        price: price,
        priceText: "$" + price,
        currency: currency,

        presentation: presentation,
        origin: originText,

        quantity: safeQuantity,
        quantityText: String(safeQuantity)
      }
    }
  };
}

module.exports = detailDataSource;
