/* =========================================================
   BIANCA & RUBEN — WEDDING REGISTRY
   PRIVATE ADMIN
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://hqhsfeyehzphaaswvrui.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_gheeLaaY6eAQa0_jffm2FA_Sh6L2Pw6";

const db =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


/* =========================================================
   STATE
========================================================= */

let gifts = [];
let reservations = [];
let otherGifts = [];
let recipes = [];

let editingGift = null;
let activeOtherGift = null;
let activeRecipe = null;


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  document.querySelectorAll(selector);


/* =========================================================
   ELEMENTS
========================================================= */

const els = {

  loginScreen:
    $("#loginScreen"),

  adminShell:
    $("#adminShell"),

  loginForm:
    $("#loginForm"),

  loginStatus:
    $("#loginStatus"),

  logoutButton:
    $("#logoutButton"),


  /* Panels */

  overviewPanel:
    $("#overviewPanel"),

  giftsPanel:
    $("#giftsPanel"),

  reservationsPanel:
    $("#reservationsPanel"),

  otherGiftsPanel:
    $("#otherGiftsPanel"),

  recipesPanel:
    $("#recipesPanel"),


  /* Lists */

  giftList:
    $("#giftList"),

  reservationList:
    $("#reservationList"),

  otherGiftList:
    $("#otherGiftList"),

  recipeList:
    $("#recipeList"),

  recentActivityList:
    $("#recentActivityList"),

  exportRecipeBookButton:
   $("#exportRecipeBookButton"),


  /* Gift filters */

  giftSearch:
    $("#giftSearch"),

  giftFilter:
    $("#giftFilter"),


  /* Reservation filters */

  reservationSearch:
    $("#reservationSearch"),

  reservationFilter:
    $("#reservationFilter"),


  /* Outside gift filters */

  otherGiftSearch:
    $("#otherGiftSearch"),

  otherGiftFilter:
    $("#otherGiftFilter"),


  /* Recipe filters */

  recipeSearch:
    $("#recipeSearch"),

  recipeFilter:
    $("#recipeFilter"),


  /* Gift editor */

  giftEditor:
    $("#giftEditor"),

  giftForm:
    $("#giftForm"),

  giftFormTitle:
    $("#giftFormTitle"),

  giftFormStatus:
    $("#giftFormStatus"),

  giftImageFile:
    $("#giftImageFile"),

  openChoiceField:
    $("#openChoiceField"),


  /* Main stats */

  statTotal:
    $("#statTotal"),

  statAvailable:
    $("#statAvailable"),

  statReserved:
    $("#statReserved"),

  statGifted:
    $("#statGifted"),


  /* Secondary stats */

  statPendingOtherGifts:
    $("#statPendingOtherGifts"),

  statApprovedOtherGifts:
    $("#statApprovedOtherGifts"),

  statNewRecipes:
    $("#statNewRecipes"),


  /* Outside gift dialog */

  otherGiftDialog:
    $("#otherGiftDialog"),

  otherGiftDialogTitle:
    $("#otherGiftDialogTitle"),

  otherGiftDialogContent:
    $("#otherGiftDialogContent"),

  approveOtherGiftButton:
    $("#approveOtherGiftButton"),

  rejectOtherGiftButton:
    $("#rejectOtherGiftButton"),


  /* Recipe dialog */

  recipeAdminDialog:
    $("#recipeAdminDialog"),

  recipeAdminDialogTitle:
    $("#recipeAdminDialogTitle"),

  recipeAdminDialogContent:
    $("#recipeAdminDialogContent"),

  markRecipeReviewedButton:
    $("#markRecipeReviewedButton"),

  favouriteRecipeButton:
    $("#favouriteRecipeButton")

};


/* =========================================================
   GENERAL HELPERS
========================================================= */

function escapeHtml(value = "") {

  return String(value).replace(
    /[&<>'"]/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[character]
  );

}


function normalise(value = "") {

  return String(value)
    .trim()
    .toLowerCase();

}


function money(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  return new Intl.NumberFormat(
    "en-ZA",
    {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0
    }
  ).format(Number(value));

}


function formatDate(value) {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "en-ZA",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );

}


function remaining(gift) {

  return Math.max(

    0,

    Number(
      gift.quantity_wanted || 1
    )

    -

    Number(
      gift.quantity_reserved || 0
    )

    -

    Number(
      gift.quantity_purchased || 0
    )

  );

}


function isOpenChoice(gift) {

  return (
    gift.open_choice === true ||
    gift.open_choice === "true"
  );

}


function giftTypeLabel(gift) {

  return isOpenChoice(gift)
    ? "Gift Idea"
    : "Specific Pick";

}


function outsideGiftStatus(item) {

  return normalise(
    item.approval_status ||
    "pending"
  );

}


function recipeStatus(recipe) {

  return normalise(
    recipe.status ||
    "new"
  );

}


/* =========================================================
   AUTH
========================================================= */

async function showCorrectScreen() {

  const {
    data: {
      session
    }
  } =
    await db.auth.getSession();


  const signedIn =
    Boolean(session);


  if (els.loginScreen) {

    els.loginScreen.hidden =
      signedIn;

  }


  if (els.adminShell) {

    els.adminShell.hidden =
      !signedIn;

  }


  if (signedIn) {

    await refreshAll();

    openAdminTab(
      "overview"
    );

  }

}


els.loginForm?.addEventListener(
  "submit",

  async event => {

    event.preventDefault();


    els.loginStatus.textContent =
      "Signing in…";


    const form =
      new FormData(
        event.currentTarget
      );


    const {
      error
    } =
      await db.auth
        .signInWithPassword({

          email:
            form.get("email"),

          password:
            form.get("password")

        });


    if (error) {

      els.loginStatus.textContent =
        error.message;

      return;

    }


    els.loginStatus.textContent =
      "";


    await showCorrectScreen();

  }
);


els.logoutButton?.addEventListener(
  "click",

  async () => {

    await db.auth.signOut();

    await showCorrectScreen();

  }
);

/* =========================================================
   EXPORT RECIPE BOOK
========================================================= */

els.exportRecipeBookButton?.addEventListener(
  "click",

  () => {

    exportRecipeBook();

  }
);

db.auth.onAuthStateChange(
  () => {

    showCorrectScreen();

  }
);


/* =========================================================
   LOAD ALL DATA
========================================================= */

async function refreshAll() {

  const [
    giftsResult,
    reservationsResult,
    otherGiftsResult,
    recipesResult
  ] =
    await Promise.all([


      db
        .from("gifts")
        .select("*")
        .order(
          "display_order",
          {
            ascending: true
          }
        ),


      db
        .from("reservations")
        .select(
          "*, gifts(name)"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        ),


      db
        .from("other_gifts")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        ),


      db
        .from("recipes")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        )

    ]);


  if (giftsResult.error) {

    console.error(
      giftsResult.error
    );

    alert(
      `Could not load gifts: ${giftsResult.error.message}`
    );

    return;

  }


  if (reservationsResult.error) {

    console.error(
      reservationsResult.error
    );

    alert(
      `Could not load reservations: ${reservationsResult.error.message}`
    );

    return;

  }


  if (otherGiftsResult.error) {

    console.error(
      "Outside gifts:",
      otherGiftsResult.error
    );

  }


  if (recipesResult.error) {

    console.error(
      "Recipes:",
      recipesResult.error
    );

  }


  gifts =
    giftsResult.data || [];

  reservations =
    reservationsResult.data || [];

  otherGifts =
    otherGiftsResult.data || [];

  recipes =
    recipesResult.data || [];


  renderEverything();

}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderEverything() {

  renderStats();

  renderGifts();

  renderReservations();

  renderOtherGifts();

  renderRecipes();

  renderRecentActivity();

}


/* =========================================================
   STATS
========================================================= */

function renderStats() {

  if (els.statTotal) {

    els.statTotal.textContent =
      gifts.length;

  }


  if (els.statAvailable) {

    els.statAvailable.textContent =
      gifts.reduce(
        (sum, gift) =>
          sum + remaining(gift),
        0
      );

  }

  if (els.statGifted) {
  els.statGifted.textContent = gifts.reduce(
    (sum, gift) =>
      sum +
      Number(gift.quantity_reserved || 0) +
      Number(gift.quantity_purchased || 0),
    0
  );
}


  const pendingOther =
    otherGifts.filter(
      item =>
        outsideGiftStatus(item) ===
        "pending"
    ).length;


  const approvedOther =
    otherGifts.filter(
      item =>
        outsideGiftStatus(item) ===
        "approved"
    ).length;


  const newRecipes =
    recipes.filter(
      item =>
        recipeStatus(item) ===
        "new"
    ).length;


  if (
    els.statPendingOtherGifts
  ) {

    els.statPendingOtherGifts.textContent =
      pendingOther;

  }


  if (
    els.statApprovedOtherGifts
  ) {

    els.statApprovedOtherGifts.textContent =
      approvedOther;

  }


  if (
    els.statNewRecipes
  ) {

    els.statNewRecipes.textContent =
      newRecipes;

  }

}


/* =========================================================
   TABS
========================================================= */

function openAdminTab(name) {

  $$(".tab").forEach(
    tab => {

      const active =
        tab.dataset.tab === name;

      tab.classList.toggle(
        "active",
        active
      );

    }
  );


  $$("[data-admin-panel]")
    .forEach(
      panel => {

        panel.hidden =
          panel.dataset.adminPanel !==
          name;

      }
    );

}


/* =========================================================
   GIFT ROW
========================================================= */

function giftRow(gift) {

  const rem =
    remaining(gift);

  const claimed =
    rem === 0;

  const type =
    giftTypeLabel(gift);


  const image =
    gift.image_url

      ? `
          <img
            class="gift-thumb"
            src="${escapeHtml(
              gift.image_url
            )}"
            alt=""
          >
        `

      : `
          <div class="gift-thumb">
            B&amp;R
          </div>
        `;


  const brandText =
    gift.brand &&
    normalise(gift.brand) !==
      "open choice"

      ? ` · ${escapeHtml(
          gift.brand
        )}`

      : "";


  return `

    <article
      class="gift-row"
      data-gift-row="${gift.id}"
    >

      ${image}


      <div class="gift-main">

        <h3>
          ${escapeHtml(
            gift.name
          )}
        </h3>

        <div class="sub">

          ${escapeHtml(
            gift.category || ""
          )}

          ${brandText}

          ${
            gift.price
              ? ` · ${money(
                  gift.price
                )}`
              : ""
          }

        </div>

      </div>


      <div class="gift-metrics">

        <div class="sub">

          Wanted
          ${gift.quantity_wanted || 1}

          · Gifted / claimed
          ${
            Number(gift.quantity_reserved || 0) +
            Number(gift.quantity_purchased || 0)
          }

        </div>

        <strong>
          ${rem} available
        </strong>

      </div>


      <div class="status-pills">

        <span class="pill gift-type">
          ${type}
        </span>

        ${
          !gift.is_visible

            ? `
                <span class="pill hidden">
                  Hidden
                </span>
              `

            : ""
        }

        ${
          gift.featured

            ? `
                <span class="pill">
                  Favourite ♡
                </span>
              `

            : ""
        }

        <span
          class="pill ${
            claimed
              ? "claimed"
              : "available"
          }"
        >
          ${
            claimed
              ? "Claimed"
              : "Available"
          }
        </span>

      </div>


      <div class="row-actions">

        <button
          class="btn ghost"
          data-edit="${gift.id}"
          type="button"
        >
          Edit
        </button>

        <button
          class="btn ghost"
          data-toggle-visible="${gift.id}"
          type="button"
        >
          ${
            gift.is_visible
              ? "Hide"
              : "Show"
          }
        </button>

        <button
          class="btn danger"
          data-delete="${gift.id}"
          type="button"
        >
          Delete
        </button>

      </div>

    </article>

  `;

}


/* =========================================================
   RENDER GIFTS
========================================================= */

function renderGifts() {

  if (!els.giftList) {
    return;
  }


  const query =
    normalise(
      els.giftSearch?.value
    );


  const filter =
    els.giftFilter?.value ||
    "all";


  const filtered =
    gifts.filter(
      gift => {

        const text =
          normalise(`
            ${gift.name || ""}
            ${gift.brand || ""}
            ${gift.category || ""}
          `);


        if (
          query &&
          !text.includes(query)
        ) {
          return false;
        }


        if (
          filter === "visible" &&
          !gift.is_visible
        ) {
          return false;
        }


        if (
          filter === "hidden" &&
          gift.is_visible
        ) {
          return false;
        }


        if (
          filter === "available" &&
          remaining(gift) < 1
        ) {
          return false;
        }


        if (
          filter === "claimed" &&
          remaining(gift) > 0
        ) {
          return false;
        }


        if (
          filter === "specific" &&
          isOpenChoice(gift)
        ) {
          return false;
        }


        if (
          filter === "open-choice" &&
          !isOpenChoice(gift)
        ) {
          return false;
        }


        return true;

      }
    );


  els.giftList.innerHTML =
    filtered.length

      ? filtered
          .map(giftRow)
          .join("")

      : `
          <div class="empty">
            No gifts match this view.
          </div>
        `;

}


/* =========================================================
   RESERVATION ROW
========================================================= */

function reservationRow(
  reservation
) {

  const status =
    reservation.status ||
    "reserved";


  return `

    <article
      class="reservation-row"
    >


      <div>

        <h3>
          ${escapeHtml(
            reservation.gifts?.name ||
            "Deleted gift"
          )}
        </h3>

        <div class="sub">
          ${formatDate(
            reservation.created_at
          )}
        </div>

      </div>


      <div>

        <strong>
          ${escapeHtml(
            reservation.guest_name ||
            ""
          )}
        </strong>

        <div class="reservation-contact">
          ${escapeHtml(
            reservation.guest_contact ||
            reservation.guest_email ||
            ""
          )}
        </div>

      </div>


      <div>

        <span class="sub">
          Quantity
        </span>

        <br>

        <strong>
          ${reservation.quantity || 1}
        </strong>

      </div>


      <div>

        <span class="pill">
 
        ${escapeHtml(
 
          status === "reserved"
 
          ? "Gifted / claimed"
           : status === "purchased"
            ? "Purchase confirmed"
            : status === "released"
             ? "Released / cancelled"
             : status
 
        )}

        </span>

      </div>


      <div
        class="reservation-actions"
      >

        ${
          status !== "reserved"

            ? `
                <button
                  class="btn ghost"
                  data-res-status="${reservation.id}"
                  data-status="reserved"
                  type="button"
                >
                  Mark as claimed
                </button>
              `

            : ""
        }


        ${
          status !== "purchased"

            ? `
                <button
                  class="btn ghost"
                  data-res-status="${reservation.id}"
                  data-status="purchased"
                  type="button"
                >
                  Confirm purchased
                </button>
              `

            : ""
        }


        ${
          status !== "released"

            ? `
                <button
                  class="btn danger"
                  data-res-status="${reservation.id}"
                  data-status="released"
                  type="button"
                >
                  Release claim
                </button>
              `

            : ""
        }

      </div>

    </article>

  `;

}


/* =========================================================
   RENDER RESERVATIONS
========================================================= */

function renderReservations() {

  if (!els.reservationList) {
    return;
  }


  const query =
    normalise(
      els.reservationSearch?.value
    );


  const filter =
    els.reservationFilter?.value ||
    "all";


  const filtered =
    reservations.filter(
      item => {

        const text =
          normalise(`
            ${item.gifts?.name || ""}
            ${item.guest_name || ""}
            ${item.guest_contact || ""}
            ${item.guest_email || ""}
          `);


        if (
          query &&
          !text.includes(query)
        ) {
          return false;
        }


        if (
          filter !== "all" &&
          normalise(item.status) !==
            filter
        ) {
          return false;
        }


        return true;

      }
    );


  els.reservationList.innerHTML =
    filtered.length

      ? filtered
          .map(reservationRow)
          .join("")

      : `
          <div class="empty">
            No gift claims match this view.
          </div>
        `;

}


/* =========================================================
   OUTSIDE GIFT ROW
========================================================= */

function otherGiftRow(item) {

  const status =
    outsideGiftStatus(item);


  const statusLabel =

    status === "approved"
      ? "Approved"

      : status === "rejected"
        ? "Rejected"

        : "Pending";


  return `

    <article
      class="reservation-row other-gift-row"
    >

      <div>

        <h3>
          ${escapeHtml(
            item.gift_name ||
            "Outside gift"
          )}
        </h3>

        <div class="sub">
          ${escapeHtml(
            item.brand_store ||
            "No store specified"
          )}
        </div>

      </div>


      <div>

        <strong>
          ${escapeHtml(
            item.guest_name ||
            ""
          )}
        </strong>

        <div class="sub">
          ${formatDate(
            item.created_at
          )}
        </div>

      </div>


      <div>

        <span class="sub">
          Quantity
        </span>

        <br>

        <strong>
          ${Number(
            item.quantity || 1
          )}
        </strong>

      </div>


      <div>

        <span
          class="pill ${status}"
        >
          ${statusLabel}
        </span>

      </div>


      <div class="row-actions">

        <button
          type="button"
          class="btn ghost"
          data-view-other-gift="${item.id}"
        >
          View
        </button>


        ${
          status !== "approved"

            ? `
                <button
                  type="button"
                  class="btn primary"
                  data-approve-other-gift="${item.id}"
                >
                  Approve
                </button>
              `

            : ""
        }

      </div>

    </article>

  `;

}


/* =========================================================
   RENDER OUTSIDE GIFTS
========================================================= */

function renderOtherGifts() {

  if (!els.otherGiftList) {
    return;
  }


  const query =
    normalise(
      els.otherGiftSearch?.value
    );


  const filter =
    els.otherGiftFilter?.value ||
    "all";


  const filtered =
    otherGifts.filter(
      item => {

        const text =
          normalise(`
            ${item.guest_name || ""}
            ${item.gift_name || ""}
            ${item.brand_store || ""}
            ${item.note || ""}
          `);


        if (
          query &&
          !text.includes(query)
        ) {
          return false;
        }


        if (
          filter !== "all" &&
          outsideGiftStatus(item) !==
            filter
        ) {
          return false;
        }


        return true;

      }
    );


  els.otherGiftList.innerHTML =
    filtered.length

      ? filtered
          .map(otherGiftRow)
          .join("")

      : `
          <div class="empty">
            No outside gifts match this view.
          </div>
        `;

}


/* =========================================================
   OPEN OUTSIDE GIFT
========================================================= */

function openOtherGiftDialog(
  item
) {

  if (
    !item ||
    !els.otherGiftDialog
  ) {
    return;
  }


  activeOtherGift =
    item;


  els.otherGiftDialogTitle.textContent =
    item.gift_name ||
    "Gift submission";


  els.otherGiftDialogContent.innerHTML = `

    <div class="admin-detail-grid">

      <div>

        <span class="sub">
          Submitted by
        </span>

        <strong>
          ${escapeHtml(
            item.guest_name ||
            ""
          )}
        </strong>

      </div>


      <div>

        <span class="sub">
          Quantity
        </span>

        <strong>
          ${Number(
            item.quantity || 1
          )}
        </strong>

      </div>


      <div>

        <span class="sub">
          Brand / store
        </span>

        <strong>
          ${escapeHtml(
            item.brand_store ||
            "Not specified"
          )}
        </strong>

      </div>


      <div>

        <span class="sub">
          Submitted
        </span>

        <strong>
          ${escapeHtml(
            formatDate(
              item.created_at
            )
          )}
        </strong>

      </div>

    </div>


    ${
      item.note

        ? `
            <div class="admin-detail-note">

              <span class="sub">
                Note
              </span>

              <p>
                ${escapeHtml(
                  item.note
                )}
              </p>

            </div>
          `

        : ""
    }

  `;


  const status =
    outsideGiftStatus(item);


  if (
    els.approveOtherGiftButton
  ) {

    els.approveOtherGiftButton.disabled =
      status === "approved";

  }


  if (
    els.rejectOtherGiftButton
  ) {

    els.rejectOtherGiftButton.disabled =
      status === "rejected";

  }


  els.otherGiftDialog.showModal();

}


/* =========================================================
   UPDATE OUTSIDE GIFT STATUS
========================================================= */

async function updateOtherGiftStatus(
  item,
  status
) {

  if (!item) {
    return;
  }


  const payload = {

    approval_status:
      status

  };


  /*
   * The public view already references approved_at.
   */

  if (
    status === "approved"
  ) {

    payload.approved_at =
      new Date().toISOString();

  }


  const {
    error
  } =
    await db
      .from("other_gifts")
      .update(payload)
      .eq(
        "id",
        item.id
      );


  if (error) {

    console.error(error);

    alert(
      `Could not update this gift: ${error.message}`
    );

    return;

  }


  activeOtherGift = null;


  if (
    els.otherGiftDialog?.open
  ) {

    els.otherGiftDialog.close();

  }


  await refreshAll();

}


/* =========================================================
   RECIPE ROW
========================================================= */

function recipeRow(recipe) {

  const status =
    recipeStatus(recipe);


  const title =
    recipe.recipe_name ||
    (
      recipe.image_url
        ? "Photo recipe"
        : "Recipe"
    );


  const type =
    recipe.image_url
      ? "Photo"
      : "Manual";


  return `

    <article
      class="reservation-row recipe-admin-row"
    >

      <div>

        <h3>
          ${escapeHtml(title)}
        </h3>

        <div class="sub">

          ${escapeHtml(type)}

          ${
            recipe.category
              ? ` · ${escapeHtml(
                  recipe.category
                )}`
              : ""
          }

        </div>

      </div>


      <div>

        <strong>
          ${escapeHtml(
            recipe.guest_name ||
            ""
          )}
        </strong>

        <div class="sub">
          ${formatDate(
            recipe.created_at
          )}
        </div>

      </div>


      <div>

        <span
          class="pill ${status}"
        >
          ${
            status === "new"
              ? "New"

              : status === "favourite"
                ? "Favourite"

                : "Reviewed"
          }
        </span>

      </div>


      <div class="row-actions">

        <button
          type="button"
          class="btn ghost"
          data-view-recipe="${recipe.id}"
        >
          View recipe
        </button>

      </div>

    </article>

  `;

}


/* =========================================================
   RENDER RECIPES
========================================================= */

function renderRecipes() {

  if (!els.recipeList) {
    return;
  }


  const query =
    normalise(
      els.recipeSearch?.value
    );


  const filter =
    els.recipeFilter?.value ||
    "all";


  const filtered =
    recipes.filter(
      recipe => {

        const text =
          normalise(`
            ${recipe.guest_name || ""}
            ${recipe.recipe_name || ""}
            ${recipe.category || ""}
            ${recipe.ingredients || ""}
            ${recipe.note || ""}
          `);


        if (
          query &&
          !text.includes(query)
        ) {
          return false;
        }


        if (
          filter !== "all" &&
          recipeStatus(recipe) !==
            filter
        ) {
          return false;
        }


        return true;

      }
    );


  els.recipeList.innerHTML =
    filtered.length

      ? filtered
          .map(recipeRow)
          .join("")

      : `
          <div class="empty">
            No recipes match this view.
          </div>
        `;

}


/* =========================================================
   OPEN RECIPE
========================================================= */

function openRecipeDialog(
  recipe
) {

  if (
    !recipe ||
    !els.recipeAdminDialog
  ) {
    return;
  }


  activeRecipe =
    recipe;


  const title =
    recipe.recipe_name ||
    "Recipe submission";


  els.recipeAdminDialogTitle.textContent =
    title;


  let content = `

    <div class="admin-detail-grid">

      <div>

        <span class="sub">
          Submitted by
        </span>

        <strong>
          ${escapeHtml(
            recipe.guest_name ||
            ""
          )}
        </strong>

      </div>


      <div>

        <span class="sub">
          Submitted
        </span>

        <strong>
          ${escapeHtml(
            formatDate(
              recipe.created_at
            )
          )}
        </strong>

      </div>

    </div>

  `;


  if (
    recipe.image_url
  ) {

    content += `

      <div class="recipe-admin-image">

        <img
          src="${escapeHtml(
            recipe.image_url
          )}"
          alt="Recipe submitted by ${escapeHtml(
            recipe.guest_name ||
            "guest"
          )}"
        >

      </div>

    `;

  }


  if (
    recipe.category
  ) {

    content += `

      <div class="admin-detail-note">

        <span class="sub">
          Category
        </span>

        <p>
          ${escapeHtml(
            recipe.category
          )}
        </p>

      </div>

    `;

  }


  if (
    recipe.ingredients
  ) {

    content += `

      <div class="admin-detail-note">

        <span class="sub">
          Ingredients
        </span>

        <p class="preserve-lines">
          ${escapeHtml(
            recipe.ingredients
          )}
        </p>

      </div>

    `;

  }


  if (
    recipe.method
  ) {

    content += `

      <div class="admin-detail-note">

        <span class="sub">
          Method
        </span>

        <p class="preserve-lines">
          ${escapeHtml(
            recipe.method
          )}
        </p>

      </div>

    `;

  }


  if (
    recipe.note
  ) {

    content += `

      <div class="admin-detail-note">

        <span class="sub">
          Guest note
        </span>

        <p>
          ${escapeHtml(
            recipe.note
          )}
        </p>

      </div>

    `;

  }


  els.recipeAdminDialogContent.innerHTML =
    content;


  els.recipeAdminDialog.showModal();

}


/* =========================================================
   UPDATE RECIPE STATUS
========================================================= */

async function updateRecipeStatus(
  status
) {

  if (!activeRecipe) {
    return;
  }


  const {
    error
  } =
    await db
      .from("recipes")
      .update({
        status
      })
      .eq(
        "id",
        activeRecipe.id
      );


  if (error) {

    console.error(error);

    alert(
      `Could not update this recipe: ${error.message}`
    );

    return;

  }


  activeRecipe = null;


  if (
    els.recipeAdminDialog?.open
  ) {

    els.recipeAdminDialog.close();

  }


  await refreshAll();

}


/* =========================================================
   RECENT ACTIVITY
========================================================= */

function renderRecentActivity() {

  if (!els.recentActivityList) {
    return;
  }

  const items = [];


  /* ---------------------------------------------------------
     REGISTRY RESERVATIONS / PURCHASES
  --------------------------------------------------------- */

  reservations.forEach(item => {

    const status =
      normalise(item.status);

    items.push({

      date:
        item.created_at,

      type:
        status === "purchased"
          ? "Gift purchased"
          : status === "released"
            ? "Gift claim released"
            : "Gift claimed",

      tone:
        status === "purchased"
          ? "purchased"
          : status === "released"
            ? "released"
            : "reserved",

      title:
        item.gifts?.name ||
        "Registry gift",

      guest:
        item.guest_name ||
        "Guest"

    });

  });


  /* ---------------------------------------------------------
     OUTSIDE GIFTS
  --------------------------------------------------------- */

  otherGifts.forEach(item => {

    items.push({

      date:
        item.created_at,

      type:
        "Outside gift",

      tone:
        "outside",

      title:
        item.gift_name ||
        "Gift submission",

      guest:
        item.guest_name ||
        "Guest"

    });

  });


  /* ---------------------------------------------------------
     RECIPES
  --------------------------------------------------------- */

  recipes.forEach(item => {

    items.push({

      date:
        item.created_at,

      type:
        "Recipe",

      tone:
        "recipe",

      title:
        item.recipe_name ||
        "Photo recipe",

      guest:
        item.guest_name ||
        "Guest"

    });

  });


  /* ---------------------------------------------------------
     NEWEST FIRST
  --------------------------------------------------------- */

  items.sort(
    (a, b) =>
      new Date(b.date) -
      new Date(a.date)
  );


  const recent =
    items.slice(0, 8);


  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  els.recentActivityList.innerHTML =
    recent.length

      ? recent
          .map(item => `

            <article
              class="recent-activity-row"
              data-activity-tone="${escapeHtml(item.tone)}"
            >

              <div class="recent-activity-type">

                <span class="activity-dot"></span>

                <span>
                  ${escapeHtml(item.type)}
                </span>

              </div>


              <div class="recent-activity-main">

                <strong>
                  ${escapeHtml(item.title)}
                </strong>

                <span>
                  ${escapeHtml(item.guest)}
                </span>

              </div>


              <time
                class="recent-activity-date"
                datetime="${escapeHtml(item.date || "")}"
              >
                ${escapeHtml(
                  formatDate(item.date)
                )}
              </time>

            </article>

          `)
          .join("")

      : `
          <div class="empty">
            No guest activity yet.
          </div>
        `;

}

/* =========================================================
   GIFT TYPE CONTROL
========================================================= */

function setGiftType(
  type
) {

  if (!els.giftForm) {
    return;
  }


  const specific =
    els.giftForm.querySelector(
      '[name="gift_type"][value="specific"]'
    );


  const openChoice =
    els.giftForm.querySelector(
      '[name="gift_type"][value="open_choice"]'
    );


  if (
    type === "open_choice"
  ) {

    openChoice.checked =
      true;

    specific.checked =
      false;

    els.openChoiceField.value =
      "true";

  } else {

    specific.checked =
      true;

    openChoice.checked =
      false;

    els.openChoiceField.value =
      "false";

  }

}


function syncGiftType() {

  if (!els.giftForm) {
    return;
  }


  const selected =
    els.giftForm.querySelector(
      '[name="gift_type"]:checked'
    );


  els.openChoiceField.value =
    selected?.value ===
      "open_choice"

      ? "true"
      : "false";

}


/* =========================================================
   OPEN GIFT EDITOR
========================================================= */

function openGiftEditor(
  gift = null
) {

  editingGift =
    gift;


  els.giftForm.reset();


  els.giftFormStatus.textContent =
    "";


  els.giftFormTitle.textContent =
    gift
      ? "Edit gift"
      : "Add gift";


  els.giftForm.elements
    .is_visible.checked =
      true;


  els.giftForm.elements
    .quantity_wanted.value =
      1;


  els.giftForm.elements
    .display_order.value =
      100;


  setGiftType(
    gift &&
    isOpenChoice(gift)
      ? "open_choice"
      : "specific"
  );


  if (gift) {

    const fields = [

      "id",
      "name",
      "category",
      "brand",
      "price",
      "quantity_wanted",
      "display_order",
      "store_url",
      "description",
      "image_url"

    ];


    fields.forEach(
      key => {

        if (
          els.giftForm.elements[key]
        ) {

          els.giftForm.elements[key].value =
            gift[key] ?? "";

        }

      }
    );


    els.giftForm.elements
      .featured.checked =
        Boolean(
          gift.featured
        );


    els.giftForm.elements
      .is_visible.checked =
        Boolean(
          gift.is_visible
        );


    setGiftType(
      isOpenChoice(gift)
        ? "open_choice"
        : "specific"
    );

  }


  els.giftEditor.showModal();

}


/* =========================================================
   IMAGE UPLOAD
========================================================= */

async function uploadImage(file) {

  const maxSize =
    5 * 1024 * 1024;


  if (
    file.size > maxSize
  ) {

    throw new Error(
      "The image is larger than 5 MB. Please choose a smaller image."
    );

  }


  const allowedTypes = [

    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif"

  ];


  if (
    !allowedTypes.includes(
      file.type
    )
  ) {

    throw new Error(
      "Please upload a JPG, PNG, WEBP or AVIF image."
    );

  }


  const cleanName =
    file.name
      .toLowerCase()
      .replace(
        /[^a-z0-9._-]+/g,
        "-"
      );


  const path =
    `gifts/${crypto.randomUUID()}-${cleanName}`;


  const {
    error
  } =
    await db.storage
      .from("registry-images")
      .upload(
        path,
        file,
        {
          cacheControl:
            "3600",

          upsert:
            false
        }
      );


  if (error) {
    throw error;
  }


  return db.storage
    .from("registry-images")
    .getPublicUrl(path)
    .data
    .publicUrl;

}


/* =========================================================
   SAVE GIFT
========================================================= */

els.giftForm?.addEventListener(
  "submit",

  async event => {

    event.preventDefault();


    const saveButton =
      $("#saveGiftButton");


    saveButton.disabled =
      true;


    els.giftFormStatus.textContent =
      "Saving…";


    try {

      syncGiftType();


      const form =
        new FormData(
          event.currentTarget
        );


      let imageUrl =
        String(
          form.get(
            "image_url"
          ) || ""
        ).trim() ||
        null;


      const file =
        els.giftImageFile
          ?.files?.[0];


      if (file) {

        els.giftFormStatus.textContent =
          "Uploading image…";


        imageUrl =
          await uploadImage(
            file
          );

      }


      const selectedType =
        form.get(
          "gift_type"
        );


      const openChoice =
        selectedType ===
          "open_choice";


      const payload = {

        name:
          String(
            form.get("name") || ""
          ).trim(),

        category:
          String(
            form.get("category") || ""
          ).trim(),

        brand:
          String(
            form.get("brand") || ""
          ).trim() ||
          null,

        price:
          form.get("price")

            ? Number(
                form.get("price")
              )

            : null,

        quantity_wanted:
          Number(
            form.get(
              "quantity_wanted"
            ) || 1
          ),

        display_order:
          Number(
            form.get(
              "display_order"
            ) || 100
          ),

        store_url:
          String(
            form.get(
              "store_url"
            ) || ""
          ).trim() ||
          null,

        description:
          String(
            form.get(
              "description"
            ) || ""
          ).trim() ||
          null,

        image_url:
          imageUrl,

        featured:
          form.get(
            "featured"
          ) === "on",

        open_choice:
          openChoice,

        is_visible:
          form.get(
            "is_visible"
          ) === "on",

        updated_at:
          new Date()
            .toISOString()

      };


      if (
        !payload.name ||
        !payload.category
      ) {

        throw new Error(
          "Please enter a gift name and category."
        );

      }


      if (
        payload.quantity_wanted <
        1
      ) {

        throw new Error(
          "Quantity wanted must be at least 1."
        );

      }


      if (editingGift) {

        const claimed =

          Number(
            editingGift.quantity_reserved ||
            0
          )

          +

          Number(
            editingGift.quantity_purchased ||
            0
          );


        if (
          payload.quantity_wanted <
          claimed
        ) {

          throw new Error(
            `Quantity wanted cannot be lower than ${claimed}, because that because that many are already claimed or purchased.many are already reserved or gifted.`
          );

        }

      }


      let result;


      if (editingGift) {

        result =
          await db
            .from("gifts")
            .update(payload)
            .eq(
              "id",
              editingGift.id
            );

      } else {

        result =
          await db
            .from("gifts")
            .insert(payload);

      }


      if (result.error) {
        throw result.error;
      }


      els.giftFormStatus.textContent =
        openChoice
          ? "Gift idea saved ♡"
          : "Specific pick saved ♡";


      await refreshAll();


      setTimeout(
        () => {

          els.giftEditor.close();

          editingGift = null;

        },
        400
      );


    } catch (error) {

      console.error(error);


      els.giftFormStatus.textContent =
        error.message ||
        "Could not save this gift.";

    }


    saveButton.disabled =
      false;

  }
);


/* =========================================================
   VISIBILITY
========================================================= */

async function toggleVisibility(
  id
) {

  const gift =
    gifts.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!gift) {
    return;
  }


  const {
    error
  } =
    await db
      .from("gifts")
      .update({

        is_visible:
          !gift.is_visible,

        updated_at:
          new Date()
            .toISOString()

      })
      .eq(
        "id",
        id
      );


  if (error) {

    alert(
      error.message
    );

    return;

  }


  await refreshAll();

}


/* =========================================================
   DELETE GIFT
========================================================= */

async function deleteGift(
  id
) {

  const gift =
    gifts.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!gift) {
    return;
  }


  const confirmed =
    confirm(
      `Delete “${gift.name}”?\n\nHiding the gift is safer if you may need the reservation history later.`
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await db
      .from("gifts")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    alert(
      error.message
    );

    return;

  }


  await refreshAll();

}


/* =========================================================
   CHANGE RESERVATION STATUS
========================================================= */

async function changeReservation(
  id,
  status
) {

  const wording =
  
  status === "released"
  
    ? "release this claim and make its quantity available again"
    : status === "purchased"
      ? "confirm that this gift has been purchased"
      : "mark this gift as claimed, without confirming purchase";


  const confirmed =
    confirm(
      `Are you sure you want to ${wording}?`
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await db.rpc(
      "admin_change_reservation_status",
      {

        p_reservation_id:
          id,

        p_new_status:
          status

      }
    );


  if (error) {

    console.error(error);

    alert(
      error.message
    );

    return;

  }


  await refreshAll();

}


/* =========================================================
   FILTER EVENTS
========================================================= */

els.giftSearch?.addEventListener(
  "input",
  renderGifts
);

els.giftFilter?.addEventListener(
  "change",
  renderGifts
);


els.reservationSearch?.addEventListener(
  "input",
  renderReservations
);

els.reservationFilter?.addEventListener(
  "change",
  renderReservations
);


els.otherGiftSearch?.addEventListener(
  "input",
  renderOtherGifts
);

els.otherGiftFilter?.addEventListener(
  "change",
  renderOtherGifts
);


els.recipeSearch?.addEventListener(
  "input",
  renderRecipes
);

els.recipeFilter?.addEventListener(
  "change",
  renderRecipes
);


/* =========================================================
   GIFT TYPE CHANGE
========================================================= */

els.giftForm?.addEventListener(
  "change",

  event => {

    if (
      event.target.name ===
      "gift_type"
    ) {

      syncGiftType();

    }

  }
);


/* =========================================================
   GLOBAL CLICK EVENTS
========================================================= */

document.addEventListener(
  "click",

  event => {


    /* ---------------------------------------------
       Tabs
    ---------------------------------------------- */

    const tab =
      event.target.closest(
        "[data-tab]"
      );


    if (tab) {

      openAdminTab(
        tab.dataset.tab
      );

      return;

    }


    /* ---------------------------------------------
       Edit gift
    ---------------------------------------------- */

    const edit =
      event.target.closest(
        "[data-edit]"
      );


    if (edit) {

      const gift =
        gifts.find(
          item =>
            String(item.id) ===
            String(
              edit.dataset.edit
            )
        );


      openGiftEditor(gift);

      return;

    }


    /* ---------------------------------------------
       Visibility
    ---------------------------------------------- */

    const visibility =
      event.target.closest(
        "[data-toggle-visible]"
      );


    if (visibility) {

      toggleVisibility(
        visibility.dataset
          .toggleVisible
      );

      return;

    }


    /* ---------------------------------------------
       Delete gift
    ---------------------------------------------- */

    const deleteButton =
      event.target.closest(
        "[data-delete]"
      );


    if (deleteButton) {

      deleteGift(
        deleteButton.dataset
          .delete
      );

      return;

    }


    /* ---------------------------------------------
       Reservation status
    ---------------------------------------------- */

    const reservationStatus =
      event.target.closest(
        "[data-res-status]"
      );


    if (reservationStatus) {

      changeReservation(

        reservationStatus.dataset
          .resStatus,

        reservationStatus.dataset
          .status

      );

      return;

    }


    /* ---------------------------------------------
       View outside gift
    ---------------------------------------------- */

    const viewOther =
      event.target.closest(
        "[data-view-other-gift]"
      );


    if (viewOther) {

      const item =
        otherGifts.find(
          gift =>
            String(gift.id) ===
            String(
              viewOther.dataset
                .viewOtherGift
            )
        );


      openOtherGiftDialog(
        item
      );

      return;

    }


    /* ---------------------------------------------
       Quick approve outside gift
    ---------------------------------------------- */

    const approveOther =
      event.target.closest(
        "[data-approve-other-gift]"
      );


    if (approveOther) {

      const item =
        otherGifts.find(
          gift =>
            String(gift.id) ===
            String(
              approveOther.dataset
                .approveOtherGift
            )
        );


      const confirmed =
        confirm(
          `Approve “${item?.gift_name || "this gift"}” so it can appear publicly?`
        );


      if (confirmed) {

        updateOtherGiftStatus(
          item,
          "approved"
        );

      }


      return;

    }


    /* ---------------------------------------------
       View recipe
    ---------------------------------------------- */

    const viewRecipe =
      event.target.closest(
        "[data-view-recipe]"
      );


    if (viewRecipe) {

      const recipe =
        recipes.find(
          item =>
            String(item.id) ===
            String(
              viewRecipe.dataset
                .viewRecipe
            )
        );


      openRecipeDialog(
        recipe
      );

    }

  }
);


/* =========================================================
   BUTTON EVENTS
========================================================= */

$("#addGiftButton")
  ?.addEventListener(
    "click",
    () =>
      openGiftEditor()
  );


$("#closeGiftEditor")
  ?.addEventListener(
    "click",
    () => {

      els.giftEditor.close();

      editingGift = null;

    }
  );


$("#cancelGiftEditor")
  ?.addEventListener(
    "click",
    () => {

      els.giftEditor.close();

      editingGift = null;

    }
  );


$("#closeOtherGiftDialog")
  ?.addEventListener(
    "click",
    () => {

      els.otherGiftDialog.close();

      activeOtherGift = null;

    }
  );


$("#closeRecipeAdminDialog")
  ?.addEventListener(
    "click",
    () => {

      els.recipeAdminDialog.close();

      activeRecipe = null;

    }
  );


/* =========================================================
   OUTSIDE GIFT DIALOG ACTIONS
========================================================= */

els.approveOtherGiftButton
  ?.addEventListener(
    "click",
    () => {

      if (!activeOtherGift) {
        return;
      }


      const confirmed =
        confirm(
          `Approve “${activeOtherGift.gift_name}”?`
        );


      if (confirmed) {

        updateOtherGiftStatus(
          activeOtherGift,
          "approved"
        );

      }

    }
  );


els.rejectOtherGiftButton
  ?.addEventListener(
    "click",
    () => {

      if (!activeOtherGift) {
        return;
      }


      const confirmed =
        confirm(
          `Reject “${activeOtherGift.gift_name}”? It will not appear publicly.`
        );


      if (confirmed) {

        updateOtherGiftStatus(
          activeOtherGift,
          "rejected"
        );

      }

    }
  );


/* =========================================================
   RECIPE DIALOG ACTIONS
========================================================= */

els.markRecipeReviewedButton
  ?.addEventListener(
    "click",
    () => {

      updateRecipeStatus(
        "reviewed"
      );

    }
  );


els.favouriteRecipeButton
  ?.addEventListener(
    "click",
    () => {

      updateRecipeStatus(
        "favourite"
      );

    }
  );


/* =========================================================
   CLICK BACKDROP TO CLOSE DIALOGS
========================================================= */

els.giftEditor?.addEventListener(
  "click",

  event => {

    if (
      event.target ===
      els.giftEditor
    ) {

      els.giftEditor.close();

      editingGift = null;

    }

  }
);


els.otherGiftDialog
  ?.addEventListener(
    "click",

    event => {

      if (
        event.target ===
        els.otherGiftDialog
      ) {

        els.otherGiftDialog.close();

        activeOtherGift = null;

      }

    }
  );


els.recipeAdminDialog
  ?.addEventListener(
    "click",

    event => {

      if (
        event.target ===
        els.recipeAdminDialog
      ) {

        els.recipeAdminDialog.close();

        activeRecipe = null;

      }

    }
  );


/* =========================================================
   START
========================================================= */

showCorrectScreen();

/* =========================================================
   EXPORT RECIPE BOOK
========================================================= */

function exportRecipeBook() {

  if (!recipes || !recipes.length) {

    alert(
      "There are no recipe submissions to export yet."
    );

    return;

  }


  const sortedRecipes = [
    ...recipes
  ].sort(
    (a, b) =>
      new Date(a.created_at) -
      new Date(b.created_at)
  );


  const recipePages =
    sortedRecipes
      .map(
        (recipe, index) => {

          const recipeName =
            recipe.recipe_name ||
            "Photo Recipe";

          const guestName =
            recipe.guest_name ||
            "Wedding Guest";

          const category =
            recipe.category ||
            (
              recipe.submission_type === "photo"
                ? "Photo Recipe"
                : "Recipe"
            );

          const ingredients =
            recipe.ingredients ||
            "";

          const method =
            recipe.method ||
            "";

          const note =
            recipe.note ||
            "";

          const imageUrl =
            recipe.image_url ||
            "";


          return `

            <article class="recipe-page">

              <div class="recipe-number">
                ${String(index + 1).padStart(2, "0")}
              </div>


              <header class="recipe-heading">

                <p class="recipe-category">
                  ${escapeHtml(category)}
                </p>

                <h2>
                  ${escapeHtml(recipeName)}
                </h2>

                <p class="recipe-shared">
                  Shared with love by
                  <strong>
                    ${escapeHtml(guestName)}
                  </strong>
                </p>

              </header>


              ${
                imageUrl

                  ? `
                    <figure class="recipe-image">
                      <img
                        src="${escapeHtml(imageUrl)}"
                        alt="${escapeHtml(recipeName)}"
                      >
                    </figure>
                  `

                  : ""
              }


              ${
                ingredients

                  ? `
                    <section class="recipe-section">

                      <p class="recipe-label">
                        Ingredients
                      </p>

                      <div class="recipe-copy">
                        ${formatRecipeText(ingredients)}
                      </div>

                    </section>
                  `

                  : ""
              }


              ${
                method

                  ? `
                    <section class="recipe-section">

                      <p class="recipe-label">
                        Method
                      </p>

                      <div class="recipe-copy">
                        ${formatRecipeText(method)}
                      </div>

                    </section>
                  `

                  : ""
              }


              ${
                note

                  ? `
                    <section class="recipe-note">

                      <p class="recipe-label">
                        A little note
                      </p>

                      <p>
                        ${escapeHtml(note)}
                      </p>

                    </section>
                  `

                  : ""
              }

            </article>

          `;

        }
      )
      .join("");


  const html = `

    <!DOCTYPE html>

    <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          Bianca & Ruben — Wedding Recipe Book
        </title>


        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        >

        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin
        >

        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        >


        <style>

          *{
            box-sizing:border-box;
          }


          body{

            margin:0;

            background:#faf8f5;

            color:#302e2b;

            font-family:
              "Cormorant Garamond",
              Georgia,
              serif;

          }


          .book-cover{

            min-height:100vh;

            display:flex;

            align-items:center;
            justify-content:center;

            text-align:center;

            padding:80px 40px;

            page-break-after:always;

          }


          .book-cover-inner{
            max-width:760px;
          }


          .book-eyebrow{

            margin:0 0 28px;

            font-family:
              "Inter",
              Arial,
              sans-serif;

            font-size:10px;

            letter-spacing:.24em;

            text-transform:uppercase;

            color:#77716a;

          }


          .book-cover h1{

            margin:0;

            font-size:84px;
            font-weight:400;

            line-height:.92;

          }


          .book-rule{

            width:48px;
            height:1px;

            margin:34px auto;

            background:#b69a68;

          }


          .book-subtitle{

            margin:0;

            font-size:22px;

            color:#77716a;

          }


          .book-date{

            margin-top:34px;

            font-family:
              "Inter",
              Arial,
              sans-serif;

            font-size:10px;

            letter-spacing:.2em;

            text-transform:uppercase;

            color:#665d54;

          }


          .recipe-page{

            width:min(900px,calc(100% - 80px));

            min-height:100vh;

            margin:0 auto;

            padding:78px 0;

            page-break-after:always;

          }


          .recipe-number{

            margin-bottom:34px;

            font-family:
              "Inter",
              Arial,
              sans-serif;

            font-size:10px;

            letter-spacing:.18em;

            color:#b69a68;

          }


          .recipe-category{

            margin:0 0 14px;

            font-family:
              "Inter",
              Arial,
              sans-serif;

            font-size:9px;

            letter-spacing:.18em;

            text-transform:uppercase;

            color:#77716a;

          }


          .recipe-heading h2{

            max-width:760px;

            margin:0;

            font-size:58px;
            font-weight:400;

            line-height:.96;

          }


          .recipe-shared{

            margin:20px 0 0;

            color:#77716a;

            font-size:17px;

          }


          .recipe-shared strong{
            color:#302e2b;
            font-weight:500;
          }


          .recipe-image{

            margin:42px 0;

          }


          .recipe-image img{

            width:100%;

            max-height:700px;

            object-fit:contain;

            background:#f2eee8;

          }


          .recipe-section{

            margin-top:42px;

            padding-top:24px;

            border-top:
              1px solid #ddd8d1;

          }


          .recipe-label{

            margin:0 0 14px;

            font-family:
              "Inter",
              Arial,
              sans-serif;

            font-size:9px;

            font-weight:500;

            letter-spacing:.18em;

            text-transform:uppercase;

            color:#665d54;

          }


          .recipe-copy{

            font-size:18px;

            line-height:1.65;

            white-space:normal;

          }


          .recipe-note{

            margin-top:42px;

            padding:24px 28px;

            background:#f7ebe8;

          }


          .recipe-note p:last-child{

            margin:0;

            font-size:18px;

            font-style:italic;

            line-height:1.6;

          }


          .print-actions{

            position:fixed;

            right:24px;
            bottom:24px;

            z-index:10;

          }


          .print-actions button{

            padding:13px 20px;

            border:0;

            background:#302e2b;

            color:white;

            font-family:
              "Inter",
              Arial,
              sans-serif;

            font-size:10px;

            letter-spacing:.12em;

            text-transform:uppercase;

            cursor:pointer;

          }


          @media print{

            .print-actions{
              display:none;
            }

            body{
              background:white;
            }

            .recipe-page{
              width:100%;
            }

          }

        </style>

      </head>


      <body>


        <section class="book-cover">

          <div class="book-cover-inner">

            <p class="book-eyebrow">
              BIANCA & RUBEN
            </p>

            <h1>
              Our Wedding<br>
              Recipe Book
            </h1>

            <div class="book-rule"></div>

            <p class="book-subtitle">
              Recipes shared by the people we love.
            </p>

            <p class="book-date">
              13 · 02 · 2027
            </p>

          </div>

        </section>


        ${recipePages}


        <div class="print-actions">

          <button
            type="button"
            onclick="window.print()"
          >
            Save / Print Recipe Book
          </button>

        </div>


      </body>

    </html>

  `;


  const recipeWindow =
    window.open(
      "",
      "_blank"
    );


  if (!recipeWindow) {

    alert(
      "Please allow pop-ups so the recipe book can open."
    );

    return;

  }


  recipeWindow.document.open();

  recipeWindow.document.write(
    html
  );

  recipeWindow.document.close();

}


/* =========================================================
   FORMAT RECIPE TEXT
========================================================= */

function formatRecipeText(text) {

  return escapeHtml(text || "")
    .replace(
      /\r?\n/g,
      "<br>"
    );

}

