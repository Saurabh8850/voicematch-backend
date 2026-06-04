export function getAge(user) {
  if (user?.age) {
    return user.age;
  }
  if (!user?.date_of_birth) {
    return null;
  }
  const birth = new Date(user.date_of_birth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function getInitials(name) {
  if (!name) {
    return "?";
  }
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getDistanceKm(user, currentUser) {
  if (user?.distance_km != null) {
    return user.distance_km;
  }
  const lat1 = currentUser?.location_lat;
  const lng1 = currentUser?.location_lng;
  const lat2 = user?.location_lat;
  const lng2 = user?.location_lng;
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return Math.floor(Math.random() * 12) + 1;
  }
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.max(1, Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

export function getInterests(user) {
  if (Array.isArray(user?.interests) && user.interests.length) {
    return user.interests.slice(0, 4);
  }
  if (user?.bio) {
    const words = user.bio.split(/[\s,]+/).filter((w) => w.length > 3);
    if (words.length >= 2) {
      return words.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1, 12));
    }
  }
  return ["Music", "Travel", "Food"];
}

export function isUserOnline(user) {
  if (!user?.last_active) {
    return false;
  }
  return Date.now() - new Date(user.last_active).getTime() < 5 * 60 * 1000;
}

export function timeAgo(dateString) {
  if (!dateString) {
    return "";
  }
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "now";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  if (hours < 48) {
    return "1d";
  }
  return `${Math.floor(hours / 24)}d`;
}
