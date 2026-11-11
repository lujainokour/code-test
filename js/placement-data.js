/* Compatibility binding to the active, versioned language bank. */
window.placementQuestions = window.placementBanks.get(window.cmStorage.activeLanguage())?.questions || [];
