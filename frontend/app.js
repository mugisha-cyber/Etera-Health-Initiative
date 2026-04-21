const apiBase = document.body.dataset.apiBase || "http://localhost:5000";
const authTokenKey = "etera_auth_token";
const authUserKey = "etera_auth_user";

const defaultContent = {
  posts: [
    {
      title: "Welcome to ETERA Health Initiative",
      body:
        "We focus on practical public health training, community partnerships, and evidence-based outreach. New updates will appear here as soon as they are published."
    },
    {
      title: "How We Work",
      body:
        "Our programs combine on-the-ground education with research insights to improve health outcomes across communities."
    }
  ],
  research: []
};

const buildMediaUrl = (source) => {
  if (!source) return "";
  if (source.startsWith("http://") || source.startsWith("https://")) return source;
  if (source.startsWith("/")) return `${apiBase}${source}`;
  return `${apiBase}/${source}`;
};

const escapeHtml = (value) => {
  const str = String(value ?? "");
  return str.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
};

const buildHeaders = (options) => {
  const headers = { ...(options.headers || {}) };
  const hasBody = Object.prototype.hasOwnProperty.call(options, "body");
  const isFormData = options.body instanceof FormData;
  if (hasBody && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

const fetchJson = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: buildHeaders(options)
    });
  } catch (error) {
    throw new Error(
      "Unable to reach the API. Make sure the backend is running on http://localhost:5000."
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    payload = null;
  }

  if (response.status === 401) {
    clearAuth();
    const requiresAuth =
      document.body.dataset.requiresAuth === "true" || document.body.dataset.adminPage === "true";
    if (requiresAuth) {
      window.location.href = "login.html";
    }
  }

  if (!response.ok) {
    const message = payload?.message || "Request failed";
    throw new Error(message);
  }

  return payload;
};

const setFormStatus = (form, message, isError = false) => {
  const status = form.querySelector("[data-form-status]");
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#c0392b" : "#3aa972";
};

const setupPasswordToggles = () => {
  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const input = button.closest(".input-group")?.querySelector("input");
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      button.textContent = isHidden ? "Hide" : "Show";
    });
  });
};

const storeAuth = (token, user) => {
  if (token) {
    localStorage.setItem(authTokenKey, token);
  }
  if (user) {
    localStorage.setItem(authUserKey, JSON.stringify(user));
  }
};

const clearAuth = () => {
  localStorage.removeItem(authTokenKey);
  localStorage.removeItem(authUserKey);
};

const getAuthToken = () => localStorage.getItem(authTokenKey);
const isAdminUser = (user) => Boolean(user?.admin || user?.role === "admin");
const defaultAvatar = "assets/logo.jpeg";
const getStoredUser = () => {
  const raw = localStorage.getItem(authUserKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
};

const setupAuthNav = () => {
  const token = getAuthToken();
  const user = getStoredUser();
  const isLoggedIn = Boolean(token && user);

  document.querySelectorAll("[data-auth-guest]").forEach((el) => {
    el.style.display = isLoggedIn ? "none" : "";
  });

  document.querySelectorAll("[data-auth-user]").forEach((el) => {
    el.style.display = isLoggedIn ? "inline-flex" : "none";
  });

  document.querySelectorAll("[data-auth-admin]").forEach((el) => {
    el.style.display = isLoggedIn && isAdminUser(user) ? "inline-flex" : "none";
  });

  if (isLoggedIn) {
    updateProfileSummary(user);
  }

  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "login.html";
    });
  });
};

const redirectIfAuthenticated = () => {
  if (!document.body.classList.contains("auth-page")) return;
  const token = getAuthToken();
  const user = getStoredUser();
  if (token && user) {
    window.location.href = isAdminUser(user) ? "admin.html" : "dashboard.html";
  }
};

const createEngagementMarkup = (type, item) => {
  if (!item?.id) return "";
  return `
    <div class="action-bar" data-actions data-type="${type}" data-id="${item.id}">
      <button class="btn ghost small" data-like>
        Like <span data-like-count>0</span>
      </button>
      <button class="btn ghost small" data-share>Share</button>
      <button class="btn ghost small" data-toggle-comments>
        Comments (<span data-comment-count>0</span>)
      </button>
    </div>
    <div class="comments" data-comments hidden>
      <div class="comments-list" data-comments-list></div>
      <form class="comment-form" data-comment-form>
        <input type="text" name="comment" placeholder="Write a comment..." required />
        <button class="btn ghost small" type="submit">Post</button>
      </form>
    </div>
  `;
};

const createStatusBadge = (status) => {
  if (!status || status === "approved") return "";
  const label = status === "pending" ? "Pending approval" : "Rejected";
  return `<p class="status-badge status-${status}">Status: ${label}</p>`;
};

const updateEngagementStats = async (actionsEl) => {
  if (!actionsEl) return;
  const type = actionsEl.dataset.type;
  const id = actionsEl.dataset.id;
  if (!type || !id) return;

  try {
    const token = getAuthToken();
    const response = await fetchJson(`/api/engagement/${type}/${id}/stats`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    actionsEl.querySelector("[data-like-count]").textContent = response.likeCount || 0;
    actionsEl.querySelector("[data-comment-count]").textContent = response.commentCount || 0;
    if (response.likedByUser) {
      actionsEl.querySelector("[data-like]")?.classList.add("active");
    }
  } catch (err) {}
};

const setupNavToggle = () => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-nav-menu]");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    menu.classList.toggle("show");
  });
};

const setupActivityToggle = () => {
  const toggle = document.querySelector("[data-activity-toggle]");
  const panel = document.querySelector("[data-activity-panel]");
  if (!toggle || !panel) return;
  const updateState = (isOpen) => {
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.textContent = isOpen ? "Hide Your Activities" : "Your Activities";
    if (isOpen) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "true");
    }
  };
  updateState(false);
  toggle.addEventListener("click", () => {
    const isOpen = !panel.hasAttribute("hidden");
    updateState(!isOpen);
  });
};

const updateProfileSummary = (user) => {
  if (!user) return;
  const name = user.full_name || user.fullName || user.username || "Member";
  const email = user.email || "member@email.com";
  const role = user.role === "admin" ? "Admin" : "Member";
  const avatarUrl = user.profile_picture ? buildMediaUrl(user.profile_picture) : defaultAvatar;

  const avatarEls = document.querySelectorAll("[data-user-avatar]");
  avatarEls.forEach((avatarEl) => {
    avatarEl.src = avatarUrl;
  });

  document.querySelectorAll("[data-user-display-name]").forEach((el) => {
    el.textContent = name;
  });

  const profileName = document.querySelector("[data-profile-name]");
  if (profileName) profileName.textContent = name;
  const profileEmail = document.querySelector("[data-profile-email]");
  if (profileEmail) profileEmail.textContent = email;
  const profileRole = document.querySelector("[data-profile-role]");
  if (profileRole) profileRole.textContent = role;
  const profileUsername = document.querySelector("[data-profile-username]");
  if (profileUsername) profileUsername.textContent = user.username || "member";
};

const setupProfilePopover = () => {
  const toggle = document.querySelector("[data-profile-toggle]");
  const panel = document.querySelector("[data-profile-panel]");
  if (!toggle || !panel) return;

  const close = () => {
    panel.classList.remove("show");
    toggle.setAttribute("aria-expanded", "false");
  };

  const open = () => {
    panel.classList.add("show");
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (panel.classList.contains("show")) {
      close();
    } else {
      open();
    }
  });

  document.addEventListener("click", (event) => {
    if (!panel.classList.contains("show")) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    close();
  });

  const editBtn = panel.querySelector("[data-profile-edit]");
  editBtn?.addEventListener("click", () => {
    const target = document.querySelector("[data-profile-section]");
    if (target) {
      target.removeAttribute("hidden");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    close();
  });
};

const setupProfileSectionLink = () => {
  const link = document.querySelector("[data-profile-link]");
  const section = document.querySelector("[data-profile-section]");
  const closeBtn = document.querySelector("[data-profile-close]");
  if (!link || !section) return;
  link.addEventListener("click", () => {
    section.removeAttribute("hidden");
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  closeBtn?.addEventListener("click", () => {
    section.setAttribute("hidden", "true");
  });
  if (window.location.hash === "#profile") {
    section.removeAttribute("hidden");
  }
};

const setupGalleryModal = () => {
  const modal = document.querySelector("[data-modal]");
  if (!modal) return;
  const title = modal.querySelector("[data-modal-title]");
  const date = modal.querySelector("[data-modal-date]");
  const description = modal.querySelector("[data-modal-description]");
  const closeBtn = modal.querySelector("[data-modal-close]");

  document.querySelectorAll("[data-gallery-item]").forEach((item) => {
    item.addEventListener("click", () => {
      title.textContent = item.dataset.title || "Gallery";
      date.textContent = item.dataset.date || "";
      description.textContent = item.dataset.description || "";
      modal.classList.add("show");
    });
  });

  const close = () => modal.classList.remove("show");
  closeBtn?.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
};

const setupContactForm = () => {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormStatus(form, "Sending message...");
    const formData = new FormData(form);

    try {
      const payload = {
        name: formData.get("name"),
        email: formData.get("email"),
        message: formData.get("message")
      };
      await fetchJson("/api/contact", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      form.reset();
      setFormStatus(form, "Message sent successfully.");
    } catch (err) {
      setFormStatus(form, err.message || "Unable to send message", true);
    }
  });
};

const setupAuthForms = () => {
  const form = document.querySelector("[data-auth-form]");
  if (!form) return;

  const mode = form.dataset.authForm;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormStatus(form, "Submitting...");

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    if (mode === "register") {
      if (!payload.password || payload.password.length < 6) {
        setFormStatus(form, "Password must be at least 6 characters.", true);
        return;
      }
      if (payload.password !== payload.confirmPassword) {
        setFormStatus(form, "Passwords do not match.", true);
        return;
      }
      delete payload.confirmPassword;
    }

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetchJson(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      storeAuth(response.token, response.user);
      setFormStatus(form, mode === "register" ? "Account created." : "Login successful.");
      const nextPage = isAdminUser(response.user) ? "admin.html" : "dashboard.html";
      window.location.href = nextPage;
    } catch (err) {
      setFormStatus(form, err.message || "Authentication failed", true);
    }
  });
};

const setupResetForm = () => {
  const form = document.querySelector("[data-reset-form]");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormStatus(form, "Updating password...");
    const formData = new FormData(form);
    const email = formData.get("email")?.trim();
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (!password || password.length < 6) {
      setFormStatus(form, "Password must be at least 6 characters.", true);
      return;
    }
    if (password !== confirmPassword) {
      setFormStatus(form, "Passwords do not match.", true);
      return;
    }

    try {
      await fetchJson("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      form.reset();
      setFormStatus(form, "Password updated. You can now log in.");
    } catch (err) {
      setFormStatus(form, err.message || "Unable to update password", true);
    }
  });
};

const setupDashboard = async () => {
  const requiresAuth = document.body.dataset.requiresAuth === "true";
  if (!requiresAuth) return;

  const token = getAuthToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const nameEl = document.querySelector("[data-user-name]");
  const statusEl = document.querySelector("[data-auth-status]");

  try {
    const response = await fetchJson("/api/auth/verify", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const user = response.user || {};
    storeAuth(token, user);
    if (nameEl) nameEl.textContent = user.full_name || user.fullName || user.username || "Member";
    if (statusEl) statusEl.textContent = "Authenticated";
    updateProfileSummary(user);

    const profileForm = document.querySelector("[data-profile-form]");
    if (profileForm) {
      const fullNameInput = profileForm.querySelector("input[name='fullName']");
      const bioInput = profileForm.querySelector("textarea[name='bio']");
      const pictureInput = profileForm.querySelector("input[name='profilePicture']");
      const pictureFileInput = profileForm.querySelector("input[name='profilePictureFile']");
      if (fullNameInput) fullNameInput.value = user.full_name || user.fullName || "";
      if (bioInput) bioInput.value = user.bio || "";
      if (pictureInput) pictureInput.value = user.profile_picture || "";
      if (pictureFileInput) pictureFileInput.value = "";
    }

    const adminLink = document.querySelector("[data-admin-link]");
    if (adminLink) {
      adminLink.style.display = isAdminUser(user) ? "inline-flex" : "none";
    }

    const subscriptionToggle = document.querySelector("[data-subscription-toggle]");
    const subscriptionStatus = document.querySelector("[data-subscription-status]");
    if (subscriptionToggle) {
      subscriptionToggle.checked = Boolean(user.subscribed);
      if (subscriptionStatus) {
        subscriptionStatus.textContent = subscriptionToggle.checked
          ? "You will receive research alerts."
          : "Email alerts are paused.";
      }
      subscriptionToggle.addEventListener("change", async () => {
        if (!token) return;
        try {
          if (subscriptionStatus) subscriptionStatus.textContent = "Updating...";
          const result = await fetchJson("/api/auth/subscription", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ subscribed: subscriptionToggle.checked })
          });
          storeAuth(token, result.user);
          if (subscriptionStatus) {
            subscriptionStatus.textContent = subscriptionToggle.checked
              ? "You will receive research alerts."
              : "Email alerts are paused.";
          }
        } catch (err) {
          if (subscriptionStatus) subscriptionStatus.textContent = err.message || "Update failed.";
        }
      });
    }

    const dashboardTitle = document.querySelector("[data-dashboard-title]");
    const dashboardMessage = document.querySelector("[data-dashboard-message]");
    try {
      const content = await fetchJson("/api/content/dashboard");
      if (dashboardTitle) dashboardTitle.textContent = content.title || "Member Updates";
      if (dashboardMessage) dashboardMessage.textContent = content.message || "";
    } catch (err) {}
  } catch (err) {
    clearAuth();
    if (statusEl) statusEl.textContent = "Session expired";
    window.location.href = "login.html";
  }

  const logoutBtn = document.querySelector("[data-logout]");
  logoutBtn?.addEventListener("click", () => {
    clearAuth();
    window.location.href = "login.html";
  });

  const profileForm = document.querySelector("[data-profile-form]");
  if (profileForm) {
    const pictureFileInput = profileForm.querySelector("input[name='profilePictureFile']");
    if (pictureFileInput) {
      pictureFileInput.addEventListener("change", () => {
        const file = pictureFileInput.files?.[0];
        if (!file) return;
        const previewUrl = URL.createObjectURL(file);
        document.querySelectorAll("[data-user-avatar]").forEach((avatar) => {
          avatar.src = previewUrl;
        });
      });
    }

    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!token) return;
      setFormStatus(profileForm, "Saving...");
      const formData = new FormData(profileForm);
      const profileFile = profileForm.querySelector("input[name='profilePictureFile']")?.files?.[0];
      const currentUser = getStoredUser();
      const profilePictureValue = formData.get("profilePicture")?.trim();
      const resolvedProfilePicture =
        profilePictureValue || currentUser?.profile_picture || currentUser?.profilePicture || "";
      try {
        const result = await fetchJson("/api/auth/profile", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fullName: formData.get("fullName")?.trim(),
            bio: formData.get("bio")?.trim(),
            profilePicture: resolvedProfilePicture
          })
        });
        let updatedUser = result?.user;

        if (profileFile) {
          const pictureData = new FormData();
          pictureData.append("profilePicture", profileFile);
          const uploadResult = await fetchJson("/api/auth/profile/picture", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: pictureData
          });
          updatedUser = uploadResult?.user || updatedUser;
        }

        if (updatedUser) {
          storeAuth(token, updatedUser);
          updateProfileSummary(updatedUser);
        }
        const fileInput = profileForm.querySelector("input[name='profilePictureFile']");
        if (fileInput) fileInput.value = "";
        const pictureUrlInput = profileForm.querySelector("input[name='profilePicture']");
        if (pictureUrlInput && updatedUser?.profile_picture) {
          pictureUrlInput.value = updatedUser.profile_picture;
        }
        setFormStatus(profileForm, "Profile updated.");
      } catch (err) {
        setFormStatus(profileForm, err.message || "Unable to update profile", true);
      }
    });
  }
  setupProfilePopover();
  setupActivityToggle();
  setupProfileSectionLink();
};

const setupAdminDashboard = async () => {
  const isAdminPage = document.body.dataset.adminPage === "true";
  if (!isAdminPage) return;

  const token = getAuthToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const statusEl = document.querySelector("[data-admin-status]");
  const tableBody = document.querySelector("[data-admin-users]");
  const detailsBox = document.querySelector("[data-admin-details]");
  const dashboardForm = document.querySelector("[data-dashboard-form]");
  const dashboardTitleInput = document.querySelector("[data-dashboard-title-input]");
  const dashboardMessageInput = document.querySelector("[data-dashboard-message-input]");
  const userFilterButtons = document.querySelectorAll("[data-user-filter]");
  const adminVideoForm = document.querySelector("[data-admin-video-form]");
  const adminResearchForm = document.querySelector("[data-admin-research-form]");
  const adminPostForm = document.querySelector("[data-admin-post-form]");
  const adminGalleryForm = document.querySelector("[data-admin-gallery-form]");
  const adminVideosTable = document.querySelector("[data-admin-videos]");
  const adminResearchTable = document.querySelector("[data-admin-research]");
  const adminGalleryTable = document.querySelector("[data-admin-gallery]");

  const adminState = {
    users: [],
    videos: [],
    research: [],
    gallery: [],
    userFilter: "all"
  };

  const getFilteredUsers = () => {
    if (adminState.userFilter === "admins") {
      return adminState.users.filter((user) => user.role === "admin");
    }
    return adminState.users;
  };

  const renderDetails = (user) => {
    if (!detailsBox) return;
    if (!user) {
      detailsBox.innerHTML = "<p class='muted'>Select a user to view details.</p>";
      return;
    }

    detailsBox.innerHTML = `
      <h3>${user.full_name || user.username}</h3>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p><strong>Joined:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
      <p><strong>Bio:</strong> ${user.bio || "No bio provided."}</p>
    `;
  };

  const renderUsers = () => {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const rows = getFilteredUsers();
    if (rows.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='5'>No users found.</td></tr>";
      return;
    }

    rows.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${user.full_name || user.username}</td>
        <td>${user.email}</td>
        <td><span class="pill ${user.role === "admin" ? "pill-admin" : ""}">${user.role}</span></td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
        <td class="admin-actions">
          <button class="btn ghost" data-action="view" data-user-id="${user.id}">View</button>
          <button class="btn ghost" data-action="role" data-user-id="${user.id}">
            ${user.role === "admin" ? "Demote" : "Promote"}
          </button>
          <button class="btn danger" data-action="delete" data-user-id="${user.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  };

  const setUserFilter = (filter) => {
    adminState.userFilter = filter;
    userFilterButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.userFilter === filter);
    });
    renderUsers();
  };

  userFilterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextFilter = btn.dataset.userFilter || "all";
      setUserFilter(nextFilter);
    });
  });

  const loadUserDetails = async (userId) => {
    if (!userId) {
      renderDetails(null);
      return;
    }

    try {
      const detail = await fetchJson(`/api/admin/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      renderDetails(detail);
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || "Failed to load user details";
    }
  };

  const loadDashboardContent = async () => {
    if (!dashboardForm) return;
    try {
      const content = await fetchJson("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (dashboardTitleInput) dashboardTitleInput.value = content.title || "";
      if (dashboardMessageInput) dashboardMessageInput.value = content.message || "";
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || "Unable to load dashboard content";
    }
  };

  const renderModerationTable = (container, items, type) => {
    if (!container) return;
    container.innerHTML = "";
    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = "<tr><td colspan='4'>No submissions yet.</td></tr>";
      return;
    }

    const sorted = [...items].sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });

    sorted.forEach((item) => {
      const statusLabel = item.status || "approved";
      const showApprove = statusLabel !== "approved";
      const showReject = statusLabel !== "rejected";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.title || "Untitled"}</td>
        <td>${new Date(item.created_at).toLocaleDateString()}</td>
        <td><span class="pill status-pill-${statusLabel}">${statusLabel}</span></td>
        <td class="admin-actions">
          ${showApprove ? `<button class="btn ghost" data-action="approve" data-type="${type}" data-id="${item.id}">Approve</button>` : ""}
          ${showReject ? `<button class="btn ghost" data-action="reject" data-type="${type}" data-id="${item.id}">Reject</button>` : ""}
          <button class="btn danger" data-action="remove" data-type="${type}" data-id="${item.id}">
            Delete
          </button>
        </td>
      `;
      container.appendChild(row);
    });
  };

  const loadModerationContent = async () => {
    try {
      const [videos, research] = await Promise.all([
        fetchJson("/api/videos", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetchJson("/api/research", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      adminState.videos = videos;
      adminState.research = research;
      renderModerationTable(adminVideosTable, videos, "videos");
      renderModerationTable(adminResearchTable, research, "research");
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || "Unable to load submissions";
    }
  };

  const renderGalleryTable = (items) => {
    if (!adminGalleryTable) return;
    adminGalleryTable.innerHTML = "";
    if (!Array.isArray(items) || items.length === 0) {
      adminGalleryTable.innerHTML = "<tr><td colspan='4'>No gallery items yet.</td></tr>";
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.event_title || "Gallery"}</td>
        <td>${item.event_date ? new Date(item.event_date).toLocaleDateString() : "—"}</td>
        <td>${item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</td>
        <td class="admin-actions">
          <button class="btn danger" data-action="delete-gallery" data-id="${item.id}">
            Delete
          </button>
        </td>
      `;
      adminGalleryTable.appendChild(row);
    });
  };

  const loadGalleryContent = async () => {
    try {
      const gallery = await fetchJson("/api/gallery", {
        headers: { Authorization: `Bearer ${token}` }
      });
      adminState.gallery = gallery;
      renderGalleryTable(gallery);
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || "Unable to load gallery";
    }
  };

  try {
    const verify = await fetchJson("/api/auth/verify", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!isAdminUser(verify.user)) {
      window.location.href = "dashboard.html";
      return;
    }

      const users = await fetchJson("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      adminState.users = users;
      setUserFilter(adminState.userFilter);
      await loadUserDetails(users[0]?.id);
      loadDashboardContent();
      loadModerationContent();
      loadGalleryContent();
    if (statusEl) statusEl.textContent = "Admin dashboard ready";
  } catch (err) {
    if (statusEl) statusEl.textContent = err.message || "Failed to load admin dashboard";
  }

  tableBody?.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.action;
    const userId = button.dataset.userId;
    const user = adminState.users.find((item) => String(item.id) === String(userId));

    if (action === "view") {
      await loadUserDetails(userId);
      return;
    }

    if (action === "delete") {
      if (!confirm(`Delete ${user?.full_name || user?.username}?`)) return;
      try {
        await fetchJson(`/api/admin/user/${userId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        adminState.users = adminState.users.filter((item) => String(item.id) !== String(userId));
        renderUsers();
        await loadUserDetails(adminState.users[0]?.id);
      } catch (err) {
        if (statusEl) statusEl.textContent = err.message || "Delete failed";
      }
      return;
    }

    if (action === "role") {
      const nextRole = user?.role === "admin" ? "user" : "admin";
      try {
        const result = await fetchJson(`/api/admin/user/${userId}/role`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ role: nextRole })
        });
        const updatedUser = result.user;
        adminState.users = adminState.users.map((item) =>
          String(item.id) === String(userId) ? updatedUser : item
        );
        renderUsers();
        await loadUserDetails(userId);
      } catch (err) {
        if (statusEl) statusEl.textContent = err.message || "Role update failed";
      }
    }
  });

  dashboardForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!dashboardTitleInput || !dashboardMessageInput) return;
    try {
      const result = await fetchJson("/api/admin/dashboard", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: dashboardTitleInput.value.trim(),
          message: dashboardMessageInput.value.trim()
        })
      });
      if (statusEl) statusEl.textContent = result.message || "Dashboard content updated";
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || "Update failed";
    }
  });

  adminVideoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(adminVideoForm);
    setFormStatus(adminVideoForm, "Publishing...");
    try {
      await fetchJson("/api/videos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      adminVideoForm.reset();
      setFormStatus(adminVideoForm, "Video published.");
      fetchContent();
    } catch (err) {
      setFormStatus(adminVideoForm, err.message || "Unable to publish", true);
    }
  });

  adminResearchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(adminResearchForm);
    setFormStatus(adminResearchForm, "Publishing...");
    try {
      await fetchJson("/api/research", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      adminResearchForm.reset();
      setFormStatus(adminResearchForm, "Research published.");
      fetchContent();
      loadModerationContent();
    } catch (err) {
      setFormStatus(adminResearchForm, err.message || "Unable to publish", true);
    }
  });

  adminPostForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(adminPostForm);
    setFormStatus(adminPostForm, "Publishing...");
    try {
      await fetchJson("/api/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });
      adminPostForm.reset();
      setFormStatus(adminPostForm, "Post published.");
      fetchContent();
    } catch (err) {
      setFormStatus(adminPostForm, err.message || "Unable to publish", true);
    }
  });

  adminGalleryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(adminGalleryForm);
    setFormStatus(adminGalleryForm, "Publishing...");
    try {
      await fetchJson("/api/gallery", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      adminGalleryForm.reset();
      setFormStatus(adminGalleryForm, "Gallery item added.");
      loadGalleryContent();
      fetchContent();
    } catch (err) {
      setFormStatus(adminGalleryForm, err.message || "Unable to publish", true);
    }
  });

  const moderationHandler = async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const contentId = button.dataset.id;
    const type = button.dataset.type;
    if (!contentId || !type) return;
    const action = button.dataset.action;

    if (action === "remove") {
      if (!confirm("Delete this submission?")) return;
      try {
        await fetchJson(`/api/${type}/${contentId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        loadModerationContent();
        if (statusEl) statusEl.textContent = "Content deleted.";
      } catch (err) {
        if (statusEl) statusEl.textContent = err.message || "Delete failed";
      }
      return;
    }

    if (action === "approve" || action === "reject") {
      const nextStatus = action === "approve" ? "approved" : "rejected";
      try {
        await fetchJson(`/api/admin/content/${type}/${contentId}/status`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: nextStatus })
        });
        loadModerationContent();
        if (statusEl) statusEl.textContent = `Content ${nextStatus}.`;
      } catch (err) {
        if (statusEl) statusEl.textContent = err.message || "Status update failed";
      }
    }
  };

  adminVideosTable?.addEventListener("click", moderationHandler);
  adminResearchTable?.addEventListener("click", moderationHandler);

  adminGalleryTable?.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.action;
    const galleryId = button.dataset.id;
    if (action !== "delete-gallery" || !galleryId) return;
    if (!confirm("Delete this gallery item?")) return;
    try {
      await fetchJson(`/api/gallery/${galleryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      loadGalleryContent();
      fetchContent();
      if (statusEl) statusEl.textContent = "Gallery item deleted.";
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || "Delete failed";
    }
  });
};

const setupUserContentForms = () => {
  const researchForm = document.querySelector("[data-user-research-form]");
  const videoForm = document.querySelector("[data-user-video-form]");
  const galleryForm = document.querySelector("[data-user-gallery-form]");

  const handleSubmit = (form, endpoint, successMessage) => {
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const token = getAuthToken();
      if (!token) {
        window.location.href = "login.html";
        return;
      }

      const formData = new FormData(form);
      setFormStatus(form, "Submitting...");

      try {
        await fetchJson(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
        form.reset();
        setFormStatus(form, successMessage);
        fetchContent();
      } catch (err) {
        setFormStatus(form, err.message || "Submission failed", true);
      }
    });
  };

  if (researchForm) {
    handleSubmit(researchForm, "/api/research", "Research submitted successfully.");
  }

  if (videoForm) {
    handleSubmit(videoForm, "/api/videos", "Video submitted successfully.");
  }

  if (galleryForm) {
    handleSubmit(galleryForm, "/api/gallery", "Gallery item submitted successfully.");
  }
};

const setupGuestSubmissionForms = () => {
  const guestVideoForm = document.querySelector("[data-guest-video-form]");
  const guestResearchForm = document.querySelector("[data-guest-research-form]");

  const handleGuestSubmit = (form, endpoint, successMessage) => {
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      setFormStatus(form, "Submitting...");

      try {
        await fetchJson(endpoint, {
          method: "POST",
          body: formData
        });
        form.reset();
        setFormStatus(form, successMessage);
      } catch (err) {
        setFormStatus(form, err.message || "Submission failed", true);
      }
    });
  };

  handleGuestSubmit(
    guestVideoForm,
    "/api/videos",
    "Thanks! Your video was submitted for review."
  );
  handleGuestSubmit(
    guestResearchForm,
    "/api/research",
    "Thanks! Your research was submitted for review."
  );
};

const setupEngagementHandlers = () => {
  const loadComments = async (type, id, commentsEl) => {
    if (!commentsEl) return;
    const list = commentsEl.querySelector("[data-comments-list]");
    if (!list) return;
    list.innerHTML = "";

    try {
      const comments = await fetchJson(`/api/engagement/${type}/${id}/comments`);
      if (!Array.isArray(comments) || comments.length === 0) {
        list.innerHTML = "<p class=\"muted\">No comments yet.</p>";
        return;
      }

      const currentUser = getStoredUser();
      const allowDelete = isAdminUser(currentUser);

      comments.forEach((comment) => {
        const item = document.createElement("div");
        item.className = "comment";
        const avatar = comment.profile_picture ? buildMediaUrl(comment.profile_picture) : defaultAvatar;
        const name = comment.full_name || comment.username || "Member";
        const safeName = escapeHtml(name);
        const safeBody = escapeHtml(comment.comment);
        const dateLabel = new Date(comment.created_at).toLocaleDateString();
        const deleteButton = allowDelete
          ? `<button class="btn danger small" type="button" data-delete-comment data-type="${type}" data-id="${id}" data-comment-id="${comment.id}">Delete</button>`
          : "";
        item.innerHTML = `
          <div class="comment-header">
            <div class="comment-header-left">
              <img class="comment-avatar" src="${avatar}" alt="${safeName}" />
              <strong>${safeName}</strong>
              <span class="muted">&middot;</span>
              <span>${dateLabel}</span>
            </div>
            <div class="comment-meta">${deleteButton}</div>
          </div>
          <p>${safeBody}</p>
        `;
        list.appendChild(item);
      });
    } catch (err) {
      list.innerHTML = "<p class=\"muted\">Unable to load comments.</p>";
    }
  };

  document.addEventListener("click", async (event) => {
    const deleteCommentBtn = event.target.closest("[data-delete-comment]");
    if (deleteCommentBtn) {
      const token = getAuthToken();
      if (!token) {
        window.location.href = "login.html";
        return;
      }

      const type = deleteCommentBtn.dataset.type;
      const id = deleteCommentBtn.dataset.id;
      const commentId = deleteCommentBtn.dataset.commentId;
      if (!type || !id || !commentId) return;
      if (!confirm("Delete this comment?")) return;

      try {
        await fetchJson(`/api/engagement/${type}/${id}/comments/${commentId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        const commentsEl = deleteCommentBtn.closest(".comments");
        await loadComments(type, id, commentsEl);
        const actions = commentsEl?.previousElementSibling;
        updateEngagementStats(actions);
      } catch (err) {}
      return;
    }

    const likeButton = event.target.closest("[data-like]");
    if (likeButton) {
      const actions = likeButton.closest("[data-actions]");
      const type = actions?.dataset.type;
      const id = actions?.dataset.id;
      const token = getAuthToken();
      if (!token) {
        window.location.href = "login.html";
        return;
      }

      try {
        const response = await fetchJson(`/api/engagement/${type}/${id}/like`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        actions.querySelector("[data-like-count]").textContent = response.likeCount || 0;
        likeButton.classList.toggle("active", response.liked);
      } catch (err) {}
      return;
    }

    const shareButton = event.target.closest("[data-share]");
    if (shareButton) {
      const card = shareButton.closest(".card") || shareButton.closest(".reel-card");
      const title = card?.querySelector("h3")?.textContent || "ETERA Health Initiative";
      const shareUrl = window.location.href.split("#")[0];
      if (navigator.share) {
        try {
          await navigator.share({ title, url: shareUrl });
        } catch (err) {}
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        shareButton.textContent = "Copied";
        setTimeout(() => {
          shareButton.textContent = "Share";
        }, 1200);
      }
      return;
    }

    const toggleButton = event.target.closest("[data-toggle-comments]");
    if (toggleButton) {
      const actions = toggleButton.closest("[data-actions]");
      const type = actions?.dataset.type;
      const id = actions?.dataset.id;
      const commentsEl = actions?.nextElementSibling;
      if (!commentsEl) return;
      const isHidden = commentsEl.hasAttribute("hidden");
      if (isHidden) {
        commentsEl.removeAttribute("hidden");
        await loadComments(type, id, commentsEl);
      } else {
        commentsEl.setAttribute("hidden", "true");
      }
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-comment-form]");
    if (!form) return;
    event.preventDefault();
    const token = getAuthToken();
    if (!token) {
      window.location.href = "login.html";
      return;
    }

    const actions = form.closest(".comments")?.previousElementSibling;
    const type = actions?.dataset.type;
    const id = actions?.dataset.id;
    const input = form.querySelector("input[name='comment']");
    if (!input || !input.value.trim()) return;

    try {
      await fetchJson(`/api/engagement/${type}/${id}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: input.value.trim() })
      });
      input.value = "";
      await loadComments(type, id, form.closest(".comments"));
      updateEngagementStats(actions);
    } catch (err) {}
  });
};

const renderList = (container, items, mapper, emptyMessage = "", limit = 6) => {
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    if (emptyMessage) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = emptyMessage;
      container.appendChild(empty);
    }
    return;
  }
  items.slice(0, limit).forEach((item) => {
    container.appendChild(mapper(item));
  });
};

const updateActivityCount = (type, count) => {
  const el = document.querySelector(`[data-count-${type}]`);
  if (!el) return;
  el.textContent = Number.isFinite(count) ? count : 0;
};

const renderListWithArchive = (
  container,
  items,
  mapper,
  emptyMessage,
  archiveContainer,
  toggleButton,
  limit = 6
) => {
  renderList(container, items, mapper, emptyMessage, limit);
  if (!archiveContainer || !toggleButton) return;

  if (!Array.isArray(items) || items.length <= limit) {
    archiveContainer.innerHTML = "";
    archiveContainer.setAttribute("hidden", "true");
    toggleButton.setAttribute("hidden", "true");
    toggleButton.setAttribute("aria-expanded", "false");
    return;
  }

  const overflow = items.slice(limit);
  renderList(archiveContainer, overflow, mapper, "", overflow.length);
  archiveContainer.setAttribute("hidden", "true");
  toggleButton.removeAttribute("hidden");
  toggleButton.dataset.labelShow = "View older research";
  toggleButton.dataset.labelHide = "Hide older research";
  toggleButton.textContent = toggleButton.dataset.labelShow;
  toggleButton.setAttribute("aria-expanded", "false");
};

const setupArchiveToggle = (toggleButton, archiveContainer) => {
  if (!toggleButton || !archiveContainer) return;
  if (toggleButton.dataset.bound === "true") return;
  toggleButton.dataset.bound = "true";
  toggleButton.addEventListener("click", () => {
    const isHidden = archiveContainer.hasAttribute("hidden");
    if (isHidden) {
      archiveContainer.removeAttribute("hidden");
      toggleButton.textContent = toggleButton.dataset.labelHide || "Hide older research";
      toggleButton.setAttribute("aria-expanded", "true");
    } else {
      archiveContainer.setAttribute("hidden", "true");
      toggleButton.textContent = toggleButton.dataset.labelShow || "View older research";
      toggleButton.setAttribute("aria-expanded", "false");
    }
  });
};

const fetchContent = async () => {
  const postsContainer = document.querySelector("[data-posts]");
  const videoContainer = document.querySelector("[data-videos]");
  const researchContainer = document.querySelector("[data-research]");
  const researchArchiveContainer = document.querySelector("[data-research-archive]");
  const researchArchiveToggle = document.querySelector("[data-research-toggle]");
  const galleryContainer = document.querySelector("[data-gallery]");

  if (postsContainer) {
    try {
      const posts = await fetchJson("/api/posts");
      const items = Array.isArray(posts) && posts.length > 0 ? posts : defaultContent.posts;
      updateActivityCount("posts", items.length);
      renderList(postsContainer, items, (post) => {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <h3>${post.title || "Update"}</h3>
          <p>${post.body || ""}</p>
          ${createEngagementMarkup("posts", post)}
        `;
        return card;
      });
      postsContainer.querySelectorAll("[data-actions]").forEach(updateEngagementStats);
    } catch (err) {
      updateActivityCount("posts", defaultContent.posts.length);
      renderList(postsContainer, defaultContent.posts, (post) => {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <h3>${post.title || "Update"}</h3>
          <p>${post.body || ""}</p>
        `;
        return card;
      });
    }
  }

  if (videoContainer) {
    try {
      const videos = await fetchJson("/api/videos");
      const sortedVideos = Array.isArray(videos)
        ? videos.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        : [];
      updateActivityCount("videos", sortedVideos.length);
      const videoItems = sortedVideos.map((v) => ({ type: "video", video_url: v.video_url, title: v.title }));
      renderList(videoContainer, sortedVideos, (video) => {
        const card = document.createElement("article");
        card.className = "card";
        card.style.cursor = "pointer";
        const videoSource = buildMediaUrl(video.video_url || "");
        const poster = video.thumbnail_url ? buildMediaUrl(video.thumbnail_url) : "";
        const mediaMarkup = videoSource
          ? `<video class="card-video" controls preload="metadata" autoplay muted loop playsinline ${
              poster ? `poster="${poster}"` : ""
            }><source src="${videoSource}" /></video>`
          : `<div class="card-media"></div>`;
        card.innerHTML = `
        ${mediaMarkup}
        <h3>${video.title || "Video"}</h3>
        <p>${video.description || "No description provided."}</p>
        ${createEngagementMarkup("videos", video)}
      `;
        return card;
      }, "No videos published yet.");
      // Add click handlers to video cards
      videoContainer.querySelectorAll(".card").forEach((card, index) => {
        card.addEventListener("click", (e) => {
          if (!e.target.closest("[data-actions]")) {
            if (window.openLightbox) {
              window.openLightbox(videoItems, index);
            }
          }
        });
      });
      videoContainer.querySelectorAll("[data-actions]").forEach(updateEngagementStats);
    } catch (err) {
      updateActivityCount("videos", 0);
    }
  }

  if (researchContainer) {
    try {
      const research = await fetchJson("/api/research");
      const unsorted = Array.isArray(research) && research.length > 0 ? research : defaultContent.research;
      const items = unsorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      updateActivityCount("research", items.length);
      renderListWithArchive(
        researchContainer,
        items,
        (paper) => {
          const card = document.createElement("article");
          card.className = "card research-card";
          const researchLink = paper.content_url ? buildMediaUrl(paper.content_url) : "";
          const link = researchLink
            ? `<a class="btn ghost" href="${researchLink}" target="_blank" rel="noreferrer">Read More</a>`
            : "";
          card.innerHTML = `
        <h3>${paper.title || "Research"}</h3>
        <p class="research-author"><strong>Authors:</strong> ${paper.authors || "ETERA"}</p>
        <p class="research-description">${paper.summary || "Summary unavailable."}</p>
        ${link}
        ${createEngagementMarkup("research", paper)}
      `;
          return card;
        },
        "No research published yet.",
        researchArchiveContainer,
        researchArchiveToggle
      );
      researchContainer.querySelectorAll("[data-actions]").forEach(updateEngagementStats);
      setupArchiveToggle(researchArchiveToggle, researchArchiveContainer);
    } catch (err) {
      renderListWithArchive(
        researchContainer,
        defaultContent.research,
        (paper) => {
          const card = document.createElement("article");
          card.className = "card research-card";
          card.innerHTML = `
        <h3>${paper.title || "Research"}</h3>
        <p class="research-author"><strong>Authors:</strong> ${paper.authors || "ETERA"}</p>
        <p class="research-description">${paper.summary || "Summary unavailable."}</p>
      `;
          return card;
        },
        "",
        researchArchiveContainer,
        researchArchiveToggle
      );
      setupArchiveToggle(researchArchiveToggle, researchArchiveContainer);
      updateActivityCount("research", 0);
    }
  }

  if (galleryContainer) {
    try {
      const gallery = await fetchJson("/api/gallery");
      const galleryItems = gallery.map((item) => item.image_url ? buildMediaUrl(item.image_url) : "").filter(Boolean);
      renderList(
        galleryContainer,
        gallery,
        (item) => {
          const figure = document.createElement("figure");
          figure.className = "gallery-item";
          figure.style.cursor = "pointer";
          figure.dataset.galleryItem = "true";
          figure.dataset.title = item.event_title || "Gallery";
          figure.dataset.date = item.event_date || "";
          figure.dataset.description = item.description || "";
          const imageUrl = item.image_url ? buildMediaUrl(item.image_url) : "";
          const mediaMarkup = imageUrl
            ? `<div class="gallery-media" style="background-image: url('${imageUrl}')"></div>`
            : `<div class="gallery-media"></div>`;
          figure.innerHTML = `
        ${mediaMarkup}
        <figcaption>${item.event_title || "Gallery"}</figcaption>
      `;
          return figure;
        },
        "No gallery entries yet."
      );
      // Add click handlers to gallery items
      galleryContainer.querySelectorAll(".gallery-item").forEach((figure, index) => {
        figure.addEventListener("click", () => {
          if (window.openLightbox) {
            window.openLightbox(galleryItems, index);
          }
        });
      });
    } catch (err) {}
  }

  setupGalleryModal();
};

const setupResearchSearch = async () => {
  const searchInput = document.querySelector(".search-pill input");
  if (!searchInput) return;

  searchInput.addEventListener("input", async (e) => {
    const query = e.target.value.toLowerCase().trim();
    const researchContainer = document.querySelector("[data-research]");
    if (!researchContainer) return;

    if (!query) {
      fetchContent();
      return;
    }

    try {
      const research = await fetchJson("/api/research");
      const filtered = Array.isArray(research)
        ? research
            .filter(
              (item) =>
                (item.title || "").toLowerCase().includes(query) ||
                (item.authors || "").toLowerCase().includes(query)
            )
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        : [];

      renderList(
        researchContainer,
        filtered,
        (paper) => {
          const card = document.createElement("article");
          card.className = "card research-card";
          const researchLink = paper.content_url ? buildMediaUrl(paper.content_url) : "";
          const link = researchLink
            ? `<a class="btn ghost" href="${researchLink}" target="_blank" rel="noreferrer">Read More</a>`
            : "";
          card.innerHTML = `
        <h3>${paper.title || "Research"}</h3>
        <p class="research-author"><strong>Authors:</strong> ${paper.authors || "ETERA"}</p>
        <p class="research-description">${paper.summary || "Summary unavailable."}</p>
        ${link}
        ${createEngagementMarkup("research", paper)}
      `;
          return card;
        },
        "No research found matching your search."
      );
      researchContainer.querySelectorAll("[data-actions]").forEach(updateEngagementStats);
    } catch (err) {}
  });
};

const setupAdminToggleButtons = () => {
  const toggleFormsBtn = document.querySelector("[data-toggle-forms]");
  const formsContainer = document.querySelector("[data-forms-container]");
  const toggleModerationBtn = document.querySelector("[data-toggle-moderation]");
  const moderationContainer = document.querySelector("[data-moderation-container]");

  if (toggleFormsBtn && formsContainer) {
    toggleFormsBtn.addEventListener("click", () => {
      const isHidden = formsContainer.hasAttribute("hidden");
      if (isHidden) {
        formsContainer.removeAttribute("hidden");
        toggleFormsBtn.textContent = "Hide Forms";
        toggleFormsBtn.setAttribute("aria-expanded", "true");
      } else {
        formsContainer.setAttribute("hidden", "true");
        toggleFormsBtn.textContent = "Show Forms";
        toggleFormsBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (toggleModerationBtn && moderationContainer) {
    toggleModerationBtn.addEventListener("click", () => {
      const isHidden = moderationContainer.hasAttribute("hidden");
      if (isHidden) {
        moderationContainer.removeAttribute("hidden");
        toggleModerationBtn.textContent = "Hide Content";
        toggleModerationBtn.setAttribute("aria-expanded", "true");
      } else {
        moderationContainer.setAttribute("hidden", "true");
        toggleModerationBtn.textContent = "Show Content";
        toggleModerationBtn.setAttribute("aria-expanded", "false");
      }
    });
  }
};

const setupDashboardToggleContribute = () => {
  const toggleBtn = document.querySelector("[data-toggle-contribute]");
  const formsContainer = document.querySelector("[data-contribute-forms]");

  if (toggleBtn && formsContainer) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = formsContainer.hasAttribute("hidden");
      if (isHidden) {
        formsContainer.removeAttribute("hidden");
        toggleBtn.textContent = "Hide Forms";
        toggleBtn.setAttribute("aria-expanded", "true");
      } else {
        formsContainer.setAttribute("hidden", "true");
        toggleBtn.textContent = "Show Forms";
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    });
  }
};

const setupLightbox = () => {
  const lightboxModal = document.querySelector("[data-lightbox]");
  const lightboxBackdrop = document.querySelector("[data-lightbox-backdrop]");
  const lightboxClose = document.querySelector("[data-lightbox-close]");
  const lightboxPrev = document.querySelector("[data-lightbox-prev]");
  const lightboxNext = document.querySelector("[data-lightbox-next]");
  const lightboxContent = document.querySelector("[data-lightbox-content]");
  const lightboxCounter = document.querySelector("[data-lightbox-counter]");

  let currentItems = [];
  let currentIndex = 0;

  const openLightbox = (items, index = 0) => {
    currentItems = items;
    currentIndex = Math.max(0, Math.min(index, items.length - 1));
    lightboxModal.removeAttribute("hidden");
    showLightboxItem(currentIndex);
  };

  const closeLightbox = () => {
    lightboxModal.setAttribute("hidden", "");
    currentItems = [];
  };

  const showLightboxItem = (index) => {
    if (index < 0 || index >= currentItems.length) return;
    currentIndex = index;
    const item = currentItems[index];
    let content = "";

    if (typeof item === "string") {
      content = `<img src="${item}" alt="Gallery item" />`;
    } else if (item && item.type === "video") {
      const videoSource = buildMediaUrl(item.video_url || "");
      if (videoSource) {
        content = `<video controls><source src="${videoSource}" /></video>`;
      }
    } else if (item && item.type === "image") {
      const imageUrl = buildMediaUrl(item.image_url || item.url || "");
      if (imageUrl) {
        content = `<img src="${imageUrl}" alt="${item.title || "Gallery item"}" />`;
      }
    }

    lightboxContent.innerHTML = content;
    lightboxCounter.textContent = `${currentIndex + 1} / ${currentItems.length}`;
    lightboxPrev.disabled = currentIndex === 0;
    lightboxNext.disabled = currentIndex === currentItems.length - 1;
  };

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }
  if (lightboxBackdrop) {
    lightboxBackdrop.addEventListener("click", closeLightbox);
  }
  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", () => {
      if (currentIndex > 0) showLightboxItem(currentIndex - 1);
    });
  }
  if (lightboxNext) {
    lightboxNext.addEventListener("click", () => {
      if (currentIndex < currentItems.length - 1) showLightboxItem(currentIndex + 1);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (lightboxModal.hasAttribute("hidden")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft" && currentIndex > 0) showLightboxItem(currentIndex - 1);
    if (e.key === "ArrowRight" && currentIndex < currentItems.length - 1) showLightboxItem(currentIndex + 1);
  });

  window.openLightbox = openLightbox;
};

const init = () => {
  redirectIfAuthenticated();
  setupAuthNav();
  setupNavToggle();
  setupGalleryModal();
  setupContactForm();
  setupAuthForms();
  setupResetForm();
  setupPasswordToggles();
  setupDashboard();
  setupAdminDashboard();
  setupUserContentForms();
  setupGuestSubmissionForms();
  setupEngagementHandlers();
  setupResearchSearch();
  setupAdminToggleButtons();
  setupDashboardToggleContribute();
  setupLightbox();
  fetchContent();
};

document.addEventListener("DOMContentLoaded", init);
