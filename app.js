/* =========================================================
   BIANCA & RUBEN WEDDING REGISTRY — APP.JS
   Guest-facing registry + reservations + gift details
========================================================= */

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://hqhsfeyehzphaaswvrui.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_gheeLaaY6eAQa0_jffm2FA_Sh6L2Pw6";

const db =
  window.supabase
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      )
    : null;


/* =========================================================
   ELEMENTS
========================================================= */

const giftGrid =
  document.querySelector("#giftGrid");

const categoryFilters =
  document.querySelector("#categoryFilters");

const typeFilters =
  document.querySelector("#typeFilters");

const availableOnly =
  document.querySelector("#availableOnly");

const sortSelect =
  document.querySelector("#sortSelect");

const registryState =
  document.querySelector("#registryState");


/* Gift details dialog */

const giftDialog =
  document.querySelector("#giftDialog");

const giftDialogContent =
  document.querySelector("#giftDialogContent");

const closeGiftDialogButton =
  document.querySelector("#closeGiftDialog") ||
  giftDialog?.querySelector(".dialog-close");


/* Reservation dialog */

const reserveDialog =
  document.querySelector("#reserveDialog");

const reserveForm =
  document.querySelector("#reserveForm");

const reserveClose =
  document.querySelector("#reserveClose") ||
  document.querySelector("#closeReserveDialog") ||
  reserveDialog?.querySelector(".dialog-close");

const reserveCancel =
  document.querySelector("#reserveCancel");

const reserveDialogTitle =
  document.querySelector("#reserveDialogTitle") ||
  document.querySelector("#reserveGiftName");

const reserveDialogText =
  document.querySelector("#reserveDialogText");

const reserveGiftId =
  document.querySelector("#reserveGiftId");

const reserveQuantityWrap =
  document.querySelector("#reserveQuantityWrap") ||
  document.querySelector("#quantityField");

const reserveQuantity =
  document.querySelector("#reserveQuantity");

const reserveQuantityHelp =
  document.querySelector("#reserveQuantityHelp");

const reserveSubmit =
  document.querySelector("#reserveSubmit") ||
  reserveForm?.querySelector(
    'button[type="submit"]'
  );

const reserveStatus =
  document.querySelector("#reserveStatus") ||
  document.querySelector("#formStatus");


/* =========================================================
   STATE
========================================================= */

let gifts = [];

let activeType =
  "all";

let activeCategory =
  "all";

let activeGift =
  null;


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function normaliseValue(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase();

}


function formatPrice(value) {

  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {

    return "";

  }

  return new Intl.NumberFormat(
    "en-ZA",
    {
      style:
        "currency",

      currency:
        "ZAR",

      maximumFractionDigits:
        0
    }
  ).format(number);

}


function displayBrand(gift) {

  const brand =
    gift.brand ||
    gift.store ||
    gift.brand_store ||
    "";

  if (
    normaliseValue(brand) ===
    "open choice"
  ) {

    return "";

  }

  return String(brand).trim();

}


function isOpenChoice(gift) {

  return (
    gift.open_choice === true ||
    gift.open_choice === "true" ||
    normaliseValue(gift.type) === "idea" ||
    normaliseValue(gift.gift_type) === "idea" ||
    normaliseValue(gift.gift_type) === "open choice"
  );

}


function isFeaturedGift(gift) {

  return (
    gift.featured === true ||
    gift.featured === "true"
  );

}


function getGiftType(gift) {

  const explicit =
    normaliseValue(
      gift.type ||
      gift.gift_type ||
      ""
    );

  if (explicit) {

    return explicit;

  }

  return isOpenChoice(gift)
    ? "idea"
    : "specific";

}


function getGiftCategory(gift) {

  return String(
    gift.category ||
    "Other"
  ).trim();

}


function getGiftQuantity(gift) {

  const quantity =
    Number(
      gift.quantity_wanted ??
      gift.quantity_total ??
      gift.quantity ??
      1
    );

  return Number.isFinite(quantity)
    ? Math.max(
        1,
        quantity
      )
    : 1;

}


function getReservedQuantity(gift) {

  const quantity =
    Number(
      gift.quantity_reserved ??
      gift.reserved_quantity ??
      0
    );

  return Number.isFinite(quantity)
    ? Math.max(
        0,
        quantity
      )
    : 0;

}


function getPurchasedQuantity(gift) {

  const quantity =
    Number(
      gift.quantity_purchased ??
      gift.purchased_quantity ??
      0
    );

  return Number.isFinite(quantity)
    ? Math.max(
        0,
        quantity
      )
    : 0;

}


function getAvailableQuantity(gift) {

  return Math.max(
    0,

    getGiftQuantity(gift) -
    getReservedQuantity(gift) -
    getPurchasedQuantity(gift)
  );

}


function isGiftAvailable(gift) {

  if (
    gift.is_visible === false
  ) {

    return false;

  }

  return (
    getAvailableQuantity(gift) >
    0
  );

}


function giftAvailabilityLabel(gift) {

  const available =
    getAvailableQuantity(gift);

  const wanted =
    getGiftQuantity(gift);

  if (
    available < 1
  ) {

    return (
      getPurchasedQuantity(gift) >=
      wanted
    )
      ? "Gifted"
      : "Reserved";

  }

  return wanted > 1
    ? `${available} of ${wanted} available`
    : "Available";

}


function reserveLabel(gift) {

  if (
    !isGiftAvailable(gift)
  ) {

    return "Unavailable";

  }

  return isOpenChoice(gift)
    ? "Reserve one"
    : "Reserve this gift";

}


function getProductLink(gift) {

  return (
    gift.store_url ||
    gift.product_url ||
    gift.link ||
    gift.url ||
    ""
  );

}


function setRegistryMessage(
  message,
  isError = false
) {

  if (!registryState) {

    return;

  }

  registryState.hidden =
    !message;

  registryState.textContent =
    message ||
    "";

  registryState.classList.toggle(
    "error",
    isError
  );

}


/* =========================================================
   LOAD GIFTS
========================================================= */

async function loadGifts() {

  if (!db) {

    setRegistryMessage(
      "The registry is temporarily unavailable.",
      true
    );

    return;

  }

  setRegistryMessage(
    "Loading our registry…"
  );


  let query =
    db
      .from("gifts")
      .select("*");


  query =
    query
      .eq(
        "is_visible",
        true
      )
      .order(
        "display_order",
        {
          ascending:
            true
        }
      );


  const {
    data,
    error
  } =
    await query;


  if (error) {

    console.error(
      "Gift loading error:",
      error
    );

    setRegistryMessage(
      "We couldn't load the registry just now. Please refresh and try again.",
      true
    );

    return;

  }


  gifts =
    Array.isArray(data)
      ? data
      : [];


  setRegistryMessage(
    ""
  );

  renderCategoryFilters();

  renderGifts();

}


/* =========================================================
   CATEGORY FILTERS
========================================================= */

function renderCategoryFilters() {

  if (
    !categoryFilters
  ) {

    return;

  }


  const categories =
    [
      ...new Set(
        gifts
          .map(
            gift =>
              getGiftCategory(gift)
          )
          .filter(Boolean)
      )
    ];


  categoryFilters.innerHTML =
    "";


  const allButton =
    document.createElement(
      "button"
    );


  allButton.type =
    "button";

  allButton.className =
    "filter-chip active";

  allButton.dataset.category =
    "all";

  allButton.setAttribute(
    "aria-pressed",
    "true"
  );

  allButton.textContent =
    "All";


  categoryFilters.appendChild(
    allButton
  );


  categories.forEach(
    category => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";

      button.className =
        "filter-chip";

      button.dataset.category =
        category;

      button.setAttribute(
        "aria-pressed",
        "false"
      );

      button.textContent =
        category;


      categoryFilters.appendChild(
        button
      );

    }
  );

}


/* =========================================================
   FILTER + SORT GIFTS
========================================================= */

function getFilteredGifts() {

  let filtered =
    [...gifts];


  if (
    activeType !==
    "all"
  ) {

    filtered =
      filtered.filter(
        gift => {

          const type =
            getGiftType(gift);


          if (
            [
              "specific",
              "specific-pick",
              "specific pick"
            ].includes(
              activeType
            )
          ) {

            return (
              !isOpenChoice(gift)
            );

          }


          if (
            [
              "idea",
              "ideas",
              "open",
              "open-choice",
              "open choice"
            ].includes(
              activeType
            )
          ) {

            return (
              isOpenChoice(gift)
            );

          }


          if (
            [
              "featured",
              "favourite",
              "favorite"
            ].includes(
              activeType
            )
          ) {

            return (
              isFeaturedGift(gift)
            );

          }


          return (
            type ===
            activeType
          );

        }
      );

  }


  if (
    activeCategory !==
    "all"
  ) {

    filtered =
      filtered.filter(
        gift =>
          normaliseValue(
            getGiftCategory(gift)
          ) ===
          normaliseValue(
            activeCategory
          )
      );

  }


  if (
    availableOnly?.checked
  ) {

    filtered =
      filtered.filter(
        isGiftAvailable
      );

  }


  const sort =
    sortSelect?.value ||
    "featured";


  if (
    sort ===
    "price-low"
  ) {

    filtered.sort(
      (a, b) =>
        Number(
          a.price ||
          0
        ) -
        Number(
          b.price ||
          0
        )
    );

  }


  if (
    sort ===
    "price-high"
  ) {

    filtered.sort(
      (a, b) =>
        Number(
          b.price ||
          0
        ) -
        Number(
          a.price ||
          0
        )
    );

  }


  if (
    sort ===
    "name"
  ) {

    filtered.sort(
      (a, b) =>
        String(
          a.name ||
          ""
        )
          .localeCompare(
            String(
              b.name ||
              ""
            )
          )
    );

  }


  if (
    sort ===
    "featured"
  ) {

    filtered.sort(
      (a, b) => {

        const featuredDifference =
          Number(
            isFeaturedGift(b)
          ) -
          Number(
            isFeaturedGift(a)
          );


        if (
          featuredDifference !==
          0
        ) {

          return (
            featuredDifference
          );

        }


        return (
          Number(
            a.display_order ||
            100
          ) -
          Number(
            b.display_order ||
            100
          )
        );

      }
    );

  }


  return filtered;

}


/* =========================================================
   GIFT CARD
========================================================= */

function createGiftCard(gift) {

  const article =
    document.createElement(
      "article"
    );


  article.className =
    "gift-card";


  const available =
    isGiftAvailable(gift);

  const availableQuantity =
    getAvailableQuantity(gift);

  const totalQuantity =
    getGiftQuantity(gift);

  const brand =
    displayBrand(gift);

  const price =
    formatPrice(
      gift.price
    );


  const image =
    gift.image_url ||
    gift.image ||
    gift.image_path ||
    "";


  if (
    !available
  ) {

    article.classList.add(
      "unavailable"
    );

  }


  const imageHtml =
    image
      ? `
        <button
          type="button"
          class="gift-image-wrap gift-view-trigger"
          aria-label="View ${escapeHtml(
            gift.name ||
            "gift"
          )} details"
        >

          <img
            class="gift-image"
            src="${escapeHtml(
              image
            )}"
            alt="${escapeHtml(
              gift.name ||
              "Registry gift"
            )}"
            loading="lazy"
          >

          ${
            !available
              ? `
                <span class="gift-status-badge">
                  ${escapeHtml(
                    giftAvailabilityLabel(
                      gift
                    )
                  )}
                </span>
              `
              : ""
          }

        </button>
      `
      : `
        <button
          type="button"
          class="gift-image-wrap gift-view-trigger"
          aria-label="View ${escapeHtml(
            gift.name ||
            "gift"
          )} details"
        >

          <div class="gift-placeholder">
            B&amp;R
          </div>

        </button>
      `;


  const quantityHtml =
    totalQuantity > 1
      ? `
        <p class="gift-quantity">
          ${availableQuantity}
          of
          ${totalQuantity}
          available
        </p>
      `
      : "";


  article.innerHTML =
    `

      ${imageHtml}


      <div class="gift-card-body">

        <p class="gift-category">
          ${escapeHtml(
            getGiftCategory(gift)
          )}
        </p>


        <h3 class="gift-name">
          ${escapeHtml(
            gift.name ||
            "Registry gift"
          )}
        </h3>


        ${
          brand
            ? `
              <p class="gift-brand">
                ${escapeHtml(
                  brand
                )}
              </p>
            `
            : ""
        }


        ${
          gift.description
            ? `
              <p class="gift-description">
                ${escapeHtml(
                  gift.description
                )}
              </p>
            `
            : ""
        }


        ${quantityHtml}


        <div class="gift-card-footer">

          ${
            price
              ? `
                <span class="gift-price">
                  ${price}
                </span>
              `
              : `
                <span></span>
              `
          }


          <div class="gift-card-actions">

            <button
              type="button"
              class="gift-link gift-view-trigger"
            >
              ${
                isOpenChoice(gift)
                  ? "View idea"
                  : "View details"
              }
            </button>


            <button
              type="button"
              class="button primary reserve-gift-button"
              ${
                available
                  ? ""
                  : "disabled"
              }
            >
              ${
                available
                  ? "Reserve"
                  : giftAvailabilityLabel(
                      gift
                    )
              }
            </button>

          </div>

        </div>

      </div>

    `;


  article
    .querySelectorAll(
      ".gift-view-trigger"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openGiftDialog(
              gift
            );

          }
        );

      }
    );


  article
    .querySelector(
      ".reserve-gift-button"
    )
    ?.addEventListener(
      "click",
      () => {

        if (
          !available
        ) {

          return;

        }


        openReserveDialog(
          gift
        );

      }
    );


  return article;

}


/* =========================================================
   RENDER GIFTS
========================================================= */

function renderGifts() {

  if (
    !giftGrid
  ) {

    return;

  }


  const filtered =
    getFilteredGifts();


  giftGrid.innerHTML =
    "";


  if (
    filtered.length ===
    0
  ) {

    giftGrid.innerHTML =
      `

        <div class="registry-empty">

          <p>
            No gifts match these filters.
          </p>

        </div>

      `;

    return;

  }


  const fragment =
    document.createDocumentFragment();


  filtered.forEach(
    gift => {

      fragment.appendChild(
        createGiftCard(
          gift
        )
      );

    }
  );


  giftGrid.appendChild(
    fragment
  );

}


/* =========================================================
   GIFT DETAILS DIALOG
========================================================= */

function openGiftDialog(gift) {

  if (!gift) {
    return;
  }

  if (!giftDialog || !giftDialogContent) {

    console.error(
      "Gift details dialog is missing from index.html."
    );

    return;
  }


  const openChoice =
    isOpenChoice(gift);

  const featured =
    isFeaturedGift(gift);

  const brand =
    displayBrand(gift);

  const price =
    formatPrice(
      gift.price
    );

  const productLink =
    getProductLink(gift);

  const availability =
    giftAvailabilityLabel(
      gift
    );


  const image =
    gift.image_url ||
    gift.image ||
    gift.image_path ||
    "";


  const eyebrowParts =
    [];


  eyebrowParts.push(
    openChoice
      ? "GIFT IDEA"
      : "SPECIFIC PICK"
  );


  if (
    featured
  ) {

    eyebrowParts.push(
      "FAVOURITE ♡"
    );

  }


  if (
    gift.category
  ) {

    eyebrowParts.push(
      getGiftCategory(
        gift
      )
        .toUpperCase()
    );

  }


  giftDialogContent.innerHTML =
    `

      <div class="gift-dialog-layout">


        <div class="gift-dialog-media">

          ${
            image
              ? `
                <img
                  src="${escapeHtml(
                    image
                  )}"
                  alt="${escapeHtml(
                    gift.name ||
                    "Registry gift"
                  )}"
                >
              `
              : `
                <div class="gift-placeholder">
                  B&amp;R
                </div>
              `
          }

        </div>


        <div class="gift-dialog-copy">


          <p class="eyebrow dark">
            ${escapeHtml(
              eyebrowParts.join(
                " · "
              )
            )}
          </p>


          <h2>
            ${escapeHtml(
              gift.name ||
              "Registry gift"
            )}
          </h2>


          ${
            brand ||
            price
              ? `
                <p class="dialog-brand">

                  ${
                    brand
                      ? escapeHtml(
                          brand
                        )
                      : ""
                  }

                  ${
                    brand &&
                    price
                      ? " · "
                      : ""
                  }

                  ${price}

                </p>
              `
              : ""
          }


          ${
            gift.description
              ? `
                <p class="dialog-desc">
                  ${escapeHtml(
                    gift.description
                  )}
                </p>
              `
              : ""
          }


          ${
            openChoice
              ? `
                <p class="dialog-desc">
                  This is inspiration rather than a specific product.
                  Feel free to choose something similar that you think
                  would suit our home.
                </p>
              `
              : ""
          }


          <p class="dialog-meta">
            ${escapeHtml(
              availability
            )}
          </p>


          <div class="card-actions">


            ${
              productLink
                ? `
                  <a
                    class="button"
                    href="${escapeHtml(
                      productLink
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${
                      openChoice
                        ? "View inspiration"
                        : "View product"
                    }
                  </a>
                `
                : ""
            }


            <button
              type="button"
              class="button primary gift-dialog-reserve"
              ${
                isGiftAvailable(
                  gift
                )
                  ? ""
                  : "disabled"
              }
            >
              ${escapeHtml(
                reserveLabel(
                  gift
                )
              )}
            </button>


          </div>


        </div>


      </div>

    `;


  giftDialogContent
    .querySelector(
      ".gift-dialog-reserve"
    )
    ?.addEventListener(
      "click",
      () => {

        if (
          !isGiftAvailable(
            gift
          )
        ) {

          return;

        }


        giftDialog.close();


        openReserveDialog(
          gift
        );

      }
    );


  giftDialog.showModal();

}


function closeGiftDialog() {

  if (
    giftDialog?.open
  ) {

    giftDialog.close();

  }

}


closeGiftDialogButton
  ?.addEventListener(
    "click",
    closeGiftDialog
  );


giftDialog
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        giftDialog
      ) {

        closeGiftDialog();

      }

    }
  );


/* =========================================================
   TYPE + CATEGORY FILTER EVENTS
========================================================= */

typeFilters
  ?.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-type]"
        );


      if (
        !button
      ) {

        return;

      }


      activeType =
        normaliseValue(
          button.dataset.type ||
          "all"
        );


      typeFilters
        .querySelectorAll(
          "[data-type]"
        )
        .forEach(
          item => {

            const active =
              item ===
              button;


            item.classList.toggle(
              "active",
              active
            );


            item.setAttribute(
              "aria-pressed",
              String(
                active
              )
            );

          }
        );


      renderGifts();

    }
  );


categoryFilters
  ?.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-category]"
        );


      if (
        !button
      ) {

        return;

      }


      activeCategory =
        button.dataset.category ||
        "all";


      categoryFilters
        .querySelectorAll(
          "[data-category]"
        )
        .forEach(
          item => {

            const active =
              item ===
              button;


            item.classList.toggle(
              "active",
              active
            );


            item.setAttribute(
              "aria-pressed",
              String(
                active
              )
            );

          }
        );


      renderGifts();

    }
  );


availableOnly
  ?.addEventListener(
    "change",
    renderGifts
  );


sortSelect
  ?.addEventListener(
    "change",
    renderGifts
  );


/* =========================================================
   RESERVATION DIALOG
========================================================= */

function openReserveDialog(gift) {

  if (
    !reserveDialog ||
    !reserveForm ||
    !gift
  ) {

    return;

  }


  const availableQuantity =
    getAvailableQuantity(
      gift
    );


  if (
    availableQuantity <
    1
  ) {

    return;

  }


  activeGift =
    gift;


  reserveForm.reset();


  if (
    reserveGiftId
  ) {

    reserveGiftId.value =
      gift.id;

  }


  if (
    reserveDialogTitle
  ) {

    reserveDialogTitle.textContent =
      gift.name ||
      "Reserve this gift";

  }


  if (
    reserveDialogText
  ) {

    reserveDialogText.textContent =
      availableQuantity > 1
        ? `There are ${availableQuantity} still available.`
        : "This gift is still available.";

  }


  if (
    reserveQuantityWrap &&
    reserveQuantity
  ) {


    if (
      availableQuantity >
      1
    ) {

      reserveQuantityWrap.hidden =
        false;


      if (
        reserveQuantity.tagName ===
        "SELECT"
      ) {

        reserveQuantity.innerHTML =
          Array.from(
            {
              length:
                availableQuantity
            },
            (
              _,
              index
            ) =>
              `

                <option
                  value="${index + 1}"
                >
                  ${index + 1}
                </option>

              `
          )
            .join("");

      } else {

        reserveQuantity.min =
          "1";

        reserveQuantity.max =
          String(
            availableQuantity
          );

        reserveQuantity.value =
          "1";

      }


      if (
        reserveQuantityHelp
      ) {

        reserveQuantityHelp.textContent =
          `${availableQuantity} available`;

      }

    } else {

      reserveQuantityWrap.hidden =
        true;

      reserveQuantity.value =
        "1";

    }

  }


  const reservedRadio =
    reserveForm.querySelector(
      'input[name="status"][value="reserved"]'
    );


  if (
    reservedRadio
  ) {

    reservedRadio.checked =
      true;

  }


  if (
    reserveStatus
  ) {

    reserveStatus.textContent =
      "";

  }


  reserveDialog.showModal();

}


function closeReserveDialog() {

  if (
    reserveDialog?.open
  ) {

    reserveDialog.close();

  }


  activeGift =
    null;

}


reserveClose
  ?.addEventListener(
    "click",
    closeReserveDialog
  );


reserveCancel
  ?.addEventListener(
    "click",
    closeReserveDialog
  );


reserveDialog
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        reserveDialog
      ) {

        closeReserveDialog();

      }

    }
  );


/* =========================================================
   SUBMIT RESERVATION
========================================================= */

reserveForm
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (
        !db ||
        !activeGift
      ) {

        return;

      }


      const form =
        new FormData(
          reserveForm
        );


      const guestName =
        String(
          form.get(
            "guest_name"
          ) ||
          document.querySelector(
            "#guestName"
          )?.value ||
          ""
        )
          .trim();


      const guestContact =
        String(
          form.get(
            "guest_contact"
          ) ||
          form.get(
            "guest_email"
          ) ||
          document.querySelector(
            "#guestContact"
          )?.value ||
          document.querySelector(
            "#guestEmail"
          )?.value ||
          ""
        )
          .trim();


      const quantity =
        Math.max(
          1,
          Number(
            form.get(
              "quantity"
            ) ||
            1
          )
        );


      const status =
        String(
          form.get(
            "status"
          ) ||
          "reserved"
        ) ===
        "purchased"
          ? "purchased"
          : "reserved";


      if (
        !guestName ||
        !guestContact
      ) {

        if (
          reserveStatus
        ) {

          reserveStatus.textContent =
            "Please enter your name and email or mobile number.";

        }

        return;

      }


      if (
        quantity <
        1 ||
        quantity >
        getAvailableQuantity(
          activeGift
        )
      ) {

        if (
          reserveStatus
        ) {

          reserveStatus.textContent =
            "That quantity is no longer available. Please refresh and try again.";

        }

        return;

      }


      if (
        reserveSubmit
      ) {

        reserveSubmit.disabled =
          true;

      }


      if (
        reserveStatus
      ) {

        reserveStatus.textContent =
          status ===
          "purchased"
            ? "Saving your gift…"
            : "Confirming your reservation…";

      }


      const {
        error
      } =
        await db.rpc(
          "reserve_gift",
          {
            p_gift_id:
              activeGift.id,

            p_guest_name:
              guestName,

            p_guest_contact:
              guestContact,

            p_quantity:
              quantity,

            p_status:
              status
          }
        );


      if (
        error
      ) {

        console.error(
          "Reservation error:",
          error
        );


        if (
          reserveStatus
        ) {

          reserveStatus.textContent =
            error.message
              ?.toLowerCase()
              .includes(
                "not enough"
              )
              ? "That gift has just been claimed by someone else. Please refresh the registry."
              : "We couldn't save your gift just now. Please try again.";

        }


        if (
          reserveSubmit
        ) {

          reserveSubmit.disabled =
            false;

        }


        return;

      }


      if (
        reserveStatus
      ) {

        reserveStatus.textContent =
          status ===
          "purchased"
            ? "Thank you ♡ Your gift has been marked as purchased."
            : "Thank you ♡ Your gift has been reserved.";

      }


      await loadGifts();


      window.setTimeout(
        () => {

          closeReserveDialog();

        },
        1200
      );


      if (
        reserveSubmit
      ) {

        reserveSubmit.disabled =
          false;

      }

    }
  );


/* =========================================================
   REGISTRY HUB
========================================================= */

const registryPanels =
  document.querySelectorAll(
    "[data-registry-panel]"
  );

const registryViewButtons =
  document.querySelectorAll(
    "[data-registry-view]"
  );

const registryPanelCloseButtons =
  document.querySelectorAll(
    "[data-close-registry-panel]"
  );

const alreadyGiftedList =
  document.querySelector(
    "#alreadyGiftedList"
  );

const otherGiftForm =
  document.querySelector(
    "#otherGiftForm"
  );

const otherGiftStatus =
  document.querySelector(
    "#otherGiftStatus"
  );


function closeRegistryPanels() {

  registryPanels.forEach(
    panel => {

      panel.hidden =
        true;

    }
  );

}


async function openRegistryPanel(
  name
) {

  closeRegistryPanels();


  const panel =
    document.querySelector(
      `[data-registry-panel="${name}"]`
    );


  if (
    !panel
  ) {

    return;

  }


  panel.hidden =
    false;


  if (
    name ===
    "gifted"
  ) {

    await loadAlreadyGifted();

  }


  window.setTimeout(
    () => {

      panel.scrollIntoView(
        {
          behavior:
            "smooth",

          block:
            "start"
        }
      );

    },
    40
  );

}


registryViewButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        openRegistryPanel(
          button.dataset.registryView
        );

      }
    );

  }
);


registryPanelCloseButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        closeRegistryPanels();


        document
          .querySelector(
            "#registry"
          )
          ?.scrollIntoView(
            {
              behavior:
                "smooth",

              block:
                "start"
            }
          );

      }
    );

  }
);


/* =========================================================
   BOUGHT SOMETHING ELSE
========================================================= */

async function submitOtherGift(
  event
) {

  event.preventDefault();


  if (
    !otherGiftForm ||
    !otherGiftStatus
  ) {

    return;

  }


  if (
    !db
  ) {

    otherGiftStatus.textContent =
      "Gift submissions are temporarily unavailable.";

    return;

  }


  const submitButton =
    otherGiftForm.querySelector(
      'button[type="submit"]'
    );


  submitButton.disabled =
    true;


  otherGiftStatus.textContent =
    "Adding your gift…";


  const form =
    new FormData(
      otherGiftForm
    );


  const guestName =
    String(
      form.get(
        "guest_name"
      ) ||
      ""
    )
      .trim();


  const giftName =
    String(
      form.get(
        "gift_name"
      ) ||
      ""
    )
      .trim();


  const brandStore =
    String(
      form.get(
        "brand_store"
      ) ||
      ""
    )
      .trim();


  const note =
    String(
      form.get(
        "note"
      ) ||
      ""
    )
      .trim();


  const quantity =
    Math.max(
      1,

      Math.min(
        20,

        Number(
          form.get(
            "quantity"
          ) ||
          1
        )
      )
    );


  if (
    !guestName ||
    !giftName
  ) {

    otherGiftStatus.textContent =
      "Please enter your name and the gift you bought.";


    submitButton.disabled =
      false;


    return;

  }


  const {
    error
  } =
    await db
      .from(
        "other_gifts"
      )
      .insert(
        {
          guest_name:
            guestName,

          gift_name:
            giftName,

          brand_store:
            brandStore ||
            null,

          quantity,

          note:
            note ||
            null,

          approval_status:
            "pending"
        }
      );


  if (
    error
  ) {

    console.error(
      "Other gift submission error:",
      error
    );


    otherGiftStatus.textContent =
      "We couldn't save your gift just now. Please try again.";


    submitButton.disabled =
      false;


    return;

  }


  otherGiftForm.reset();


  otherGiftStatus.textContent =
    "Thank you ♡ Your gift has been received and will appear once we've reviewed it.";


  submitButton.disabled =
    false;

}


otherGiftForm
  ?.addEventListener(
    "submit",
    submitOtherGift
  );


/* =========================================================
   WHAT'S ALREADY BEEN GIFTED
========================================================= */

function giftedItemHtml(
  item,
  index
) {

  const brand =
    item.brand_store ||
    item.brand ||
    "";


  const sourceLabel =
    item.source ===
    "registry"
      ? "From our registry"
      : "Chosen elsewhere";


  const meta =
    [
      brand,
      sourceLabel
    ]
      .filter(Boolean)
      .join(
        " · "
      );


  const quantity =
    Number(
      item.quantity ||
      1
    );


  return `

    <article class="already-gifted-item">

      <span class="already-gifted-index">
        ${String(
          index +
          1
        ).padStart(
          2,
          "0"
        )}
      </span>


      <div class="already-gifted-copy">

        <h4>
          ${escapeHtml(
            item.name
          )}
        </h4>

        <p>
          ${escapeHtml(
            meta
          )}
        </p>

      </div>


      <span class="already-gifted-qty">

        ${
          quantity >
          1
            ? `${quantity} gifted`
            : "Gifted"
        }

      </span>

    </article>

  `;

}


async function loadAlreadyGifted() {

  if (
    !alreadyGiftedList
  ) {

    return;

  }


  alreadyGiftedList.innerHTML =
    `

      <p class="already-gifted-loading">
        Loading gifted items…
      </p>

    `;


  const registryItems =
    gifts

      .filter(
        gift =>
          getPurchasedQuantity(
            gift
          ) >
          0
      )

      .map(
        gift =>
          ({
            source:
              "registry",

            name:
              String(
                gift.name ||
                "Registry gift"
              ),

            brand:
              displayBrand(
                gift
              ),

            quantity:
              getPurchasedQuantity(
                gift
              )
          })
      );


  let otherItems =
    [];


  if (
    db
  ) {

    const {
      data,
      error
    } =
      await db

        .from(
          "public_other_gifts"
        )

        .select(
          "id, gift_name, brand_store, quantity, created_at, approved_at"
        )

        .order(
          "approved_at",
          {
            ascending:
              false,

            nullsFirst:
              false
          }
        );


    if (
      error
    ) {

      console.error(
        "Already gifted loading error:",
        error
      );

    } else {

      otherItems =
        (data || [])
          .map(
            item =>
              ({
                source:
                  "other",

                name:
                  item.gift_name,

                brand_store:
                  item.brand_store,

                quantity:
                  Number(
                    item.quantity ||
                    1
                  )
              })
          );

    }

  }


  const allItems =
    [
      ...registryItems,
      ...otherItems
    ];


  if (
    allItems.length ===
    0
  ) {

    alreadyGiftedList.innerHTML =
      `

        <p class="already-gifted-empty">
          Nothing has been marked as gifted yet.
        </p>

      `;


    return;

  }


  alreadyGiftedList.innerHTML =
    allItems
      .map(
        giftedItemHtml
      )
      .join(
        ""
      );

}


/* =========================================================
   RECIPE SECTION
========================================================= */

const recipeForm =
  document.querySelector(
    "#recipeForm"
  );

const recipeMethodButtons =
  document.querySelectorAll(
    "[data-recipe-method]"
  );

const recipeImagePanel =
  document.querySelector(
    "#recipeImagePanel"
  );

const recipeManualPanel =
  document.querySelector(
    "#recipeManualPanel"
  );

const recipeSubmissionType =
  document.querySelector(
    "#recipeSubmissionType"
  );

const recipeImage =
  document.querySelector(
    "#recipeImage"
  );

const recipePreview =
  document.querySelector(
    "#recipePreview"
  );

const recipePreviewImage =
  document.querySelector(
    "#recipePreviewImage"
  );

const removeRecipeImage =
  document.querySelector(
    "#removeRecipeImage"
  );

const recipeStatus =
  document.querySelector(
    "#recipeStatus"
  );


/* =========================================================
   RECIPE METHOD TOGGLE
========================================================= */

function setRecipeMethod(
  method
) {

  const imageMode =
    method ===
    "image";


  if (
    recipeSubmissionType
  ) {

    recipeSubmissionType.value =
      method;

  }


  if (
    recipeImagePanel
  ) {

    recipeImagePanel.hidden =
      !imageMode;

  }


  if (
    recipeManualPanel
  ) {

    recipeManualPanel.hidden =
      imageMode;

  }


  recipeMethodButtons.forEach(
    button => {

      const active =
        button.dataset.recipeMethod ===
        method;


      button.classList.toggle(
        "active",
        active
      );


      button.setAttribute(
        "aria-pressed",
        String(
          active
        )
      );

    }
  );

}


recipeMethodButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        setRecipeMethod(
          button.dataset.recipeMethod
        );

      }
    );

  }
);


/* =========================================================
   RECIPE IMAGE PREVIEW
========================================================= */

recipeImage
  ?.addEventListener(
    "change",
    () => {

      const file =
        recipeImage.files?.[0];


      if (
        !file
      ) {

        if (
          recipePreview
        ) {

          recipePreview.hidden =
            true;

        }


        return;

      }


      const previewUrl =
        URL.createObjectURL(
          file
        );


      if (
        recipePreviewImage
      ) {

        recipePreviewImage.src =
          previewUrl;

      }


      if (
        recipePreview
      ) {

        recipePreview.hidden =
          false;

      }

    }
  );


removeRecipeImage
  ?.addEventListener(
    "click",
    () => {

      if (
        recipeImage
      ) {

        recipeImage.value =
          "";

      }


      if (
        recipePreviewImage
      ) {

        recipePreviewImage.src =
          "";

      }


      if (
        recipePreview
      ) {

        recipePreview.hidden =
          true;

      }

    }
  );


/* =========================================================
   RECIPE SUBMISSION
========================================================= */

recipeForm
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (
        !db ||
        !recipeStatus
      ) {

        return;

      }


      const submitButton =
        recipeForm.querySelector(
          'button[type="submit"]'
        );


      submitButton.disabled =
        true;


      recipeStatus.textContent =
        "Sharing your recipe…";


      const form =
        new FormData(
          recipeForm
        );


      const guestName =
        String(
          form.get(
            "guest_name"
          ) ||
          ""
        )
          .trim();


      const submissionType =
        String(
          form.get(
            "submission_type"
          ) ||
          "image"
        );


      const note =
        String(
          form.get(
            "note"
          ) ||
          ""
        )
          .trim();


      if (
        !guestName
      ) {

        recipeStatus.textContent =
          "Please enter your name.";


        submitButton.disabled =
          false;


        return;

      }


      /* IMAGE SUBMISSION */

      if (
        submissionType ===
        "image"
      ) {

        const file =
          recipeImage
            ?.files?.[0];


        if (
          !file
        ) {

          recipeStatus.textContent =
            "Please add a photo of your recipe.";


          submitButton.disabled =
            false;


          return;

        }


        const allowedTypes =
          [
            "image/jpeg",
            "image/png",
            "image/webp"
          ];


        if (
          !allowedTypes.includes(
            file.type
          )
        ) {

          recipeStatus.textContent =
            "Please upload a JPG, PNG or WEBP image.";


          submitButton.disabled =
            false;


          return;

        }


        const safeFileName =
          file.name
            .toLowerCase()
            .replace(
              /[^a-z0-9._-]/g,
              "-"
            );


        const filePath =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(
              2,
              9
            )}-${safeFileName}`;


        const {
          error:
            uploadError
        } =
          await db
            .storage
            .from(
              "recipe-bucket"
            )
            .upload(
              filePath,
              file,
              {
                cacheControl:
                  "3600",

                upsert:
                  false
              }
            );


        if (
          uploadError
        ) {

          console.error(
            "Recipe upload error:",
            uploadError
          );


          recipeStatus.textContent =
            "We couldn't upload your recipe photo. Please try again.";


          submitButton.disabled =
            false;


          return;

        }


        const {
          data:
            publicUrlData
        } =
          db
            .storage
            .from(
              "recipe-bucket"
            )
            .getPublicUrl(
              filePath
            );


        const imageUrl =
          publicUrlData
            ?.publicUrl ||
          "";


        const {
          error:
            insertError
        } =
          await db
            .from(
              "recipes"
            )
            .insert(
              {
                guest_name:
                  guestName,

                note:
                  note ||
                  null,

                image_url:
                  imageUrl,

                image_path:
                  filePath,

                status:
                  "new"
              }
            );


        if (
          insertError
        ) {

          console.error(
            "Recipe insert error:",
            insertError
          );


          recipeStatus.textContent =
            "Your photo uploaded, but we couldn't save the recipe details. Please contact us.";


          submitButton.disabled =
            false;


          return;

        }

      }


      /* MANUAL SUBMISSION */

      if (
        submissionType ===
        "manual"
      ) {

        const recipeName =
          String(
            form.get(
              "recipe_name"
            ) ||
            ""
          )
            .trim();


        const category =
          String(
            form.get(
              "category"
            ) ||
            ""
          )
            .trim();


        const ingredients =
          String(
            form.get(
              "ingredients"
            ) ||
            ""
          )
            .trim();


        const method =
          String(
            form.get(
              "method"
            ) ||
            ""
          )
            .trim();


        if (
          !recipeName ||
          !ingredients ||
          !method
        ) {

          recipeStatus.textContent =
            "Please add the recipe name, ingredients and method.";


          submitButton.disabled =
            false;


          return;

        }


        const {
          error
        } =
          await db
            .from(
              "recipes"
            )
            .insert(
              {
                guest_name:
                  guestName,

                recipe_name:
                  recipeName,

                category:
                  category ||
                  null,

                ingredients,

                method,

                note:
                  note ||
                  null,

                image_url:
                  "",

                image_path:
                  null,

                status:
                  "new"
              }
            );


        if (
          error
        ) {

          console.error(
            "Manual recipe error:",
            error
          );


          recipeStatus.textContent =
            "We couldn't save your recipe just now. Please try again.";


          submitButton.disabled =
            false;


          return;

        }

      }


      recipeForm.reset();


      setRecipeMethod(
        "image"
      );


      if (
        recipePreview
      ) {

        recipePreview.hidden =
          true;

      }


      if (
        recipePreviewImage
      ) {

        recipePreviewImage.src =
          "";

      }


      recipeStatus.textContent =
        "Thank you ♡ Your recipe has been added to our collection.";


      submitButton.disabled =
        false;

    }
  );


/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    closeRegistryPanels();


    setRecipeMethod(
      "image"
    );


    await loadGifts();

  }
);


/* =========================================================
   HOME INSPIRATION — CATEGORY COLLAGES
========================================================= */

const homeGalleryDialog =
  document.querySelector(
    "#homeGalleryDialog"
  );

const openHomeGallery =
  document.querySelector(
    "#openHomeGallery"
  );

const closeHomeGallery =
  document.querySelector(
    "#closeHomeGallery"
  );

const homeGalleryCollage =
  document.querySelector(
    "#homeGalleryCollage"
  );

const homeGalleryTitle =
  document.querySelector(
    "#homeGalleryTitle"
  );

const homeGalleryDescription =
  document.querySelector(
    "#homeGalleryDescription"
  );

const homeGalleryNumber =
  document.querySelector(
    "#homeGalleryNumber"
  );

const homeGalleryCounter =
  document.querySelector(
    "#homeGalleryCounter"
  );

const homeGalleryFilters =
  document.querySelector(
    "#homeGalleryFilters"
  );


const homeGalleryCategories =
  {

    living:
      {
        title:
          "Living",

        description:
          "Warm woods, natural textures and spaces made for gathering.",

        images:
          [
            "images/living-room 2.jpg",
            "images/cozy-living-room.jpg",
            "images/Dining Table.jpg",
            "images/living_room_lamps.jpg"
          ]
      },


    kitchen:
      {
        title:
          "Kitchen",

        description:
          "Warm timber, timeless essentials and beautiful everyday rituals.",

        images:
          [
            "images/kitchen.jpg",
            "images/Kitchen Corner.jpg",
            "images/Kitchen Kettle.jpg",
            "images/Kitchen Utensils.jpg"
          ]
      },


    bedroom:
      {
        title:
          "Bedroom",

        description:
          "Soft layers, natural linen and calm earthy tones.",

        images:
          [
            "images/bedroom.jpg",
            "images/Bedroom_02.jpg",
            "images/Bedside Table.jpg",
            "images/green_bedroom.jpg"
          ]
      },


    bathroom:
      {
        title:
          "Bathroom",

        description:
          "Quiet, organised spaces with natural materials and warm details.",

        images:
          [
            "images/bathroom.jpg",
            "images/Bathroom sink.jpg",
            "images/bathroom_storage.jpg",
            "images/bathroom_storage_02.jpg"
          ]
      },


    textures:
      {
        title:
          "Textures",

        description:
          "Warm ivory, soft fabric, organic forms and natural movement.",

        images:
          [
            "images/coconut.jpg",
            "images/coral.jpg",
            "images/sand.jpg",
            "images/fabric_texture.jpg"
          ]
      }

  };


const galleryCategoryOrder =
  [
    "living",
    "kitchen",
    "bedroom",
    "bathroom",
    "textures"
  ];


function renderHomeGalleryCategory(
  category
) {

  const data =
    homeGalleryCategories[
      category
    ];


  if (
    !data ||
    !homeGalleryCollage
  ) {

    return;

  }


  homeGalleryCollage.innerHTML =
    `

      <figure
        class="gallery-collage-item gallery-collage-large"
      >
        <img
          src="${data.images[0]}"
          alt="${data.title} inspiration"
        >
      </figure>


      <figure
        class="gallery-collage-item gallery-collage-small-top"
      >
        <img
          src="${data.images[1]}"
          alt="${data.title} inspiration"
        >
      </figure>


      <figure
        class="gallery-collage-item gallery-collage-small-bottom"
      >
        <img
          src="${data.images[2]}"
          alt="${data.title} inspiration"
        >
      </figure>


      <figure
        class="gallery-collage-item gallery-collage-wide"
      >
        <img
          src="${data.images[3]}"
          alt="${data.title} inspiration"
        >
      </figure>

    `;


  const index =
    galleryCategoryOrder
      .indexOf(
        category
      );


  homeGalleryTitle.textContent =
    data.title;


  homeGalleryDescription.textContent =
    data.description;


  homeGalleryNumber.textContent =
    String(
      index +
      1
    )
      .padStart(
        2,
        "0"
      );


  homeGalleryCounter.textContent =
    `${String(
      index +
      1
    ).padStart(
      2,
      "0"
    )} / 05`;


  homeGalleryFilters
    ?.querySelectorAll(
      "[data-gallery-category]"
    )
    .forEach(
      button => {

        const active =
          button.dataset.galleryCategory ===
          category;


        button.classList.toggle(
          "active",
          active
        );


        button.setAttribute(
          "aria-pressed",
          String(
            active
          )
        );

      }
    );

}


homeGalleryFilters
  ?.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-gallery-category]"
        );


      if (
        !button
      ) {

        return;

      }


      renderHomeGalleryCategory(
        button.dataset.galleryCategory
      );

    }
  );


openHomeGallery
  ?.addEventListener(
    "click",
    () => {

      if (
        !homeGalleryDialog
      ) {

        return;

      }


      renderHomeGalleryCategory(
        "living"
      );


      homeGalleryDialog.showModal();

    }
  );


closeHomeGallery
  ?.addEventListener(
    "click",
    () => {

      homeGalleryDialog
        ?.close();

    }
  );


homeGalleryDialog
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        homeGalleryDialog
      ) {

        homeGalleryDialog.close();

      }

    }
  );


/* =========================================================
   MOBILE SITE NAVIGATION
========================================================= */

const siteNav =
  document.querySelector(
    "#siteNav"
  );

const siteNavMenu =
  document.querySelector(
    "#siteNavMenu"
  );

const siteNavLinks =
  document.querySelectorAll(
    ".site-nav-links a"
  );


siteNavMenu
  ?.addEventListener(
    "click",
    () => {

      const open =
        siteNav.classList.toggle(
          "open"
        );


      siteNavMenu.setAttribute(
        "aria-expanded",
        String(
          open
        )
      );

    }
  );


siteNavLinks.forEach(
  link => {

    link.addEventListener(
      "click",
      () => {

        siteNav
          ?.classList.remove(
            "open"
          );


        siteNavMenu
          ?.setAttribute(
            "aria-expanded",
            "false"
          );

      }
    );

  }
);


/* =========================================================
   ACTIVE NAV SECTION
========================================================= */

const navSectionLinks =
  document.querySelectorAll(
    ".site-nav-links a"
  );


const navSections =
  [];


navSectionLinks.forEach(
  link => {

    const targetId =
      link.getAttribute(
        "href"
      );


    if (
      targetId &&
      targetId.startsWith(
        "#"
      )
    ) {

      const section =
        document.querySelector(
          targetId
        );


      if (
        section
      ) {

        navSections.push(
          {
            link,
            section
          }
        );

      }

    }

  }
);


const navObserver =
  new IntersectionObserver(
    entries => {

      entries.forEach(
        entry => {

          if (
            !entry.isIntersecting
          ) {

            return;

          }


          navSectionLinks.forEach(
            link =>
              link.classList.remove(
                "active"
              )
          );


          const activeItem =
            navSections.find(
              item =>
                item.section ===
                entry.target
            );


          activeItem
            ?.link
            .classList
            .add(
              "active"
            );

        }
      );

    },
    {
      rootMargin:
        "-35% 0px -55% 0px",

      threshold:
        0
    }
  );


navSections.forEach(
  item =>
    navObserver.observe(
      item.section
    )
);