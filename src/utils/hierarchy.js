function normalizeValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function toLabel(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }

  return String(
    value.title ??
      value.name ??
      value.label ??
      value.text ??
      value.categoryName ??
      value.secondcategoryName ??
      value.subcategoryName ??
      value.id ??
      ''
  ).trim();
}

function normalizeHierarchyNode(node, fallbackLabel = '') {
  if (!node && !fallbackLabel) {
    return null;
  }

  if (typeof node === 'string' || typeof node === 'number') {
    const label = String(node).trim();
    if (!label) {
      return null;
    }

    return {
      id: label,
      label,
      raw: node,
    };
  }

  if (!node || typeof node !== 'object') {
    const label = String(fallbackLabel || '').trim();
    return label
      ? {
          id: label,
          label,
          raw: node ?? null,
        }
      : null;
  }

  const label = toLabel(node) || String(fallbackLabel || '').trim();

  if (!label) {
    return null;
  }

  const id = node.id ?? node._id ?? node.value ?? node.slug ?? label;

  return {
    id: String(id),
    label,
    raw: node,
  };
}

function getItemHierarchyNode(item, level) {
  const levelKey = String(level || '').toLowerCase();

  if (levelKey === 'category') {
    return (
      normalizeHierarchyNode(item?.categoryObj ?? item?.category ?? item?.categoryData, item?.categoryName || item?.category_title || item?.categoryTitle) ||
      null
    );
  }

  if (levelKey === 'secondcategory') {
    return (
      normalizeHierarchyNode(
        item?.secondcategoryObj ?? item?.secondcategory ?? item?.secondCategoryData,
        item?.secondcategoryName || item?.secondCategoryName || item?.secondcategory_title || item?.secondCategoryTitle
      ) || null
    );
  }

  if (levelKey === 'subcategory') {
    return (
      normalizeHierarchyNode(
        item?.subcategoryObj ?? item?.subcategory ?? item?.subCategoryData,
        item?.subcategoryName || item?.subCategoryName || item?.subcategory_title || item?.subCategoryTitle
      ) || null
    );
  }

  return null;
}

function matchesSelection(itemNode, selectedValue) {
  if (!selectedValue || selectedValue === 'All') {
    return true;
  }

  const selected = normalizeValue(selectedValue);

  if (!selected) {
    return true;
  }

  const candidates = [itemNode?.id, itemNode?.label, itemNode?.raw?.id, itemNode?.raw?.name, itemNode?.raw?.title, itemNode?.raw?.label]
    .filter(Boolean)
    .map(normalizeValue);

  return candidates.includes(selected);
}

function getFieldLevelKey(level) {
  return String(level || '').toLowerCase();
}

export function buildHierarchyOptions(items = [], level, selectedValues = {}) {
  const map = new Map();
  const levelKey = getFieldLevelKey(level);

  items.forEach((item) => {
    if (levelKey !== 'category' && selectedValues.category && !matchesSelection(getItemHierarchyNode(item, 'category'), selectedValues.category)) {
      return;
    }

    if (levelKey !== 'secondcategory' && selectedValues.secondcategory && !matchesSelection(getItemHierarchyNode(item, 'secondcategory'), selectedValues.secondcategory)) {
      return;
    }

    if (levelKey !== 'subcategory' && selectedValues.subcategory && !matchesSelection(getItemHierarchyNode(item, 'subcategory'), selectedValues.subcategory)) {
      return;
    }

    const node = getItemHierarchyNode(item, level);

    if (!node) {
      return;
    }

    const key = normalizeValue(node.id || node.label);

    if (!key || map.has(key)) {
      return;
    }

    map.set(key, node);
  });

  return [
    { value: 'All', label: 'All', raw: null },
    ...Array.from(map.values()).map((node) => ({
      value: String(node.id || node.label),
      label: node.label,
      raw: node.raw,
    })),
  ];
}

export function filterByHierarchy(items = [], selections = {}) {
  return items.filter((item) => {
    const categoryNode = getItemHierarchyNode(item, 'category');
    const secondCategoryNode = getItemHierarchyNode(item, 'secondcategory');
    const subCategoryNode = getItemHierarchyNode(item, 'subcategory');

    return (
      matchesSelection(categoryNode, selections.category) &&
      matchesSelection(secondCategoryNode, selections.secondcategory) &&
      matchesSelection(subCategoryNode, selections.subcategory)
    );
  });
}

export function getHierarchyLabel(node) {
  return node?.label || '';
}
