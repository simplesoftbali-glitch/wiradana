interface UnitCategoryItem {
  unit: string | null
  category: string | null
}

function normalizeUnit(unit: string | null | undefined) {
  return unit?.trim().toLocaleLowerCase('id-ID').replace(/[²³]/g, (character) => character === '²' ? '2' : '3').replace(/\s+/g, '') || ''
}

function normalizeCategory(category: string | null | undefined) {
  return category?.trim().toLocaleLowerCase('id-ID') || ''
}

export function hasUnitMismatch(
  expense: UnitCategoryItem,
  rabItems: UnitCategoryItem[],
) {
  const expenseUnit = normalizeUnit(expense.unit)
  if (!expenseUnit) return false

  const expenseCategory = normalizeCategory(expense.category)
  const sameCategoryItems = rabItems.filter(
    (item) => normalizeCategory(item.category) === expenseCategory,
  )

  return sameCategoryItems.length > 0
    && !sameCategoryItems.some((item) => normalizeUnit(item.unit) === expenseUnit)
}
