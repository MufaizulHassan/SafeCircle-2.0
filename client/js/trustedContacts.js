// js/trustedContacts.js
// Simple demo storage using localStorage. In production replace with API calls.

function _storageKeyForUser(userId) {
  return `safe_circle_trusted_${userId}`;
}

// Save contacts array: [{name, phone}]
function saveTrustedContacts(userId, contactsArr) {
  if (!userId) throw "Missing userId";
  localStorage.setItem(_storageKeyForUser(userId), JSON.stringify(contactsArr || []));
}

// Get contacts array (returns [] if none)
function getTrustedContacts(userId) {
  if (!userId) return [];
  const raw = localStorage.getItem(_storageKeyForUser(userId));
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Demo helper: seed default contacts for a demo user
function seedDemoTrustedContacts() {
  const demoId = "demo_user";
  const demo = [
    { name: "Aman Sharma (Father)", phone: "+91-98765xxxxx" },
    { name: "Saira Khan (Mother)", phone: "+91-91234xxxxx" }
  ];
  saveTrustedContacts(demoId, demo);
  return demoId;
}
