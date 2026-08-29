import type { Locale } from './locale';

export interface Dictionary {
  locale: Locale;
  restaurantLoad: {
    quiet: string;
    normal: string;
    busy: string;
    peak: string;
  };
  nav: {
    brand: string;
    tagline: string;
    workspace: string;
    overview: string;
    procurement: string;
    events: string;
    inventory: string;
    demoStatusTitle: string;
    demoStatusSubtitle: string;
    operationsEyebrow: string;
    demoClock: string;
  };
  resetDemo: {
    idle: string;
    busy: string;
  };
  agent: {
    trigger: string;
    eyebrow: string;
    title: string;
    contextPrefix: string;
    contextSuffix: string;
    closeAria: string;
    welcome: string;
    localMode: string;
    openaiMode: (model: string) => string;
    usingTools: string;
    messageAria: string;
    placeholder: string;
    sendAria: string;
    disclaimer: string;
    approvalRequired: string;
    approvalStatusPending: string;
    approvalStatusApplied: string;
    approvalActiveSummary: (candidateVersion: number, baseVersion: number) => string;
    approvalPendingSummary: (candidateVersion: number, baseVersion: number) => string;
    approveButton: (candidateVersion: number) => string;
    approvedChangeApplied: string;
    moreIngredientChanges: (n: number) => string;
    activityTrace: (n: number) => string;
    guestsSuffix: string;
    pageContext: {
      wedding: string;
      events: string;
      procurement: string;
      inventory: string;
      overview: string;
    };
    suggestions: {
      increaseWedding: string;
      whyChicken: string;
      readPlan: string;
      prepareSupplierOrder: string;
    };
  };
  overview: {
    greeting: string;
    subtitle: (eventCount: number) => string;
    openProcurement: string;
    restaurantOperations: {
      eyebrow: string;
      value: (days: number) => string;
      detail: string;
      metaWithPeak: (weekday: string, day: number, factor: string) => string;
      metaNoPeak: string;
    };
    eventsCatering: {
      eyebrow: string;
      value: (count: number) => string;
      detail: (guests: number) => string;
      metaLargest: (name: string, guests: number) => string;
      metaEmpty: string;
    };
    combinedProcurement: {
      eyebrow: string;
      value: (count: number) => string;
      detailNext: (day: number) => string;
      detailEmpty: string;
      metaNext: (count: number) => string;
      metaEmpty: string;
    };
    attention: {
      eyebrow: string;
      value: (actions: number) => string;
      detail: (insights: number) => string;
      meta: string;
    };
    bridge: {
      restaurantTitle: string;
      restaurantHeadline: string;
      restaurantBody: (days: number) => string;
      eventsTitle: string;
      eventsHeadline: (count: number, guests: number) => string;
      eventsBody: string;
      procurementTitle: string;
      procurementHeadline: string;
      sharedStock: string;
      confirmedIncoming: string;
    };
    demandSources: {
      title: string;
      subtitle: (count: number, guests: number) => string;
      mass: string;
      volume: string;
      units: string;
      restaurant: string;
      events: string;
    };
    timeline: {
      title: string;
      subtitle: string;
      restaurantLabel: string;
      restaurantSubtitle: string;
      eventsLabel: string;
      eventsSubtitle: string;
      procurementLabel: string;
      procurementSubtitle: string;
      guestsSuffix: string;
      delivery: string;
      ingredientsSuffix: string;
      covered: string;
    };
    upcomingBatches: {
      title: string;
      subtitle: string;
      action: string;
      lineDetail: (count: number) => string;
      next: string;
      planned: string;
    };
    attentionSection: {
      title: string;
      subtitle: string;
    };
    recentChanges: {
      title: string;
      subtitle: string;
      guestChangeSummary: (eventName: string, before: number, after: number) => string;
      activated: (version: number) => string;
      emptyTitle: string;
      emptyBody: string;
    };
    attentionItems: {
      expiryRiskTitle: (ingredientName: string) => string;
      expiryRiskDescription: string;
      expiryRiskMeta: (amount: string) => string;
      expiryRiskAction: string;
      incomingCoverageTitle: string;
      incomingCoverageDescription: string;
      incomingCoverageMeta: (n: number) => string;
      supplierReadyTitle: string;
      supplierReadyDescription: string;
      supplierReadyMeta: (deliveryOn: string, n: number) => string;
      supplierReadyAction: string;
    };
  };
  events: {
    planLabel: (version: number) => string;
    title: string;
    subtitle: string;
    confirmedGuests: string;
    columnDate: string;
    columnEvent: string;
    columnGuests: string;
    columnStatus: string;
    prepStarts: (time: string, menuLines: number) => string;
    heroFlow: string;
    confirmed: string;
  };
  wedding: {
    backToEvents: string;
    confirmed: string;
    planLabel: (version: number) => string;
    dateLine: (day: number, startsAt: string, prepAt: string) => string;
    currentGuests: string;
    updated: (name: string, version: number) => string;
    errorPreview: string;
    errorApply: string;
    menuTitle: string;
    menuSubtitle: string;
    fixedSuffix: string;
    perGuestSuffix: string;
    portionsSuffix: string;
    pendingSuffix: string;
    impact: {
      eyebrow: string;
      ingredientsUsed: string;
      nextFreshDelivery: string;
      coveredByPlan: string;
      largestDrivers: string;
      supplierStatus: string;
      matchingPending: string;
      viewFullProcurement: string;
    };
    guestChange: {
      eyebrow: string;
      title: string;
      fixedNote: string;
      hint: string;
      guestsLabel: string;
      changeLabel: string;
      guestsSuffix: string;
      reviewImpact: string;
      calculating: string;
    };
    drawer: {
      protectedPreview: string;
      titleSuffix: string;
      nothingChanges: string;
      metricGuests: string;
      metricPlan: string;
      metricIngredients: string;
      metricPurchaseLines: string;
      topDeltas: string;
      footnote: string;
      cancel: string;
      apply: string;
      applying: string;
    };
  };
  procurement: {
    planLabel: (version: number, period: string) => string;
    title: string;
    subtitle: string;
    plannedDeliveries: string;
    nextDelivery: string;
    covered: string;
    attention: string;
    actionsSuffix: string;
    supplier: string;
    matchingPending: string;
    restaurantOperations: string;
    ingredientsSuffix: string;
    next: string;
    planned: string;
    target: string;
    plannedDelivery: string;
  };
  procurementBatch: {
    backToProcurement: string;
    planLabel: (version: number) => string;
    deliveryTitle: (day: string) => string;
    targetArrival: (time: string, lines: number) => string;
    columnIngredient: string;
    columnCoveredDemand: string;
    columnStockIncoming: string;
    columnPurchase: string;
    columnStatus: string;
    columnExplanation: string;
    upcomingRequirements: (n: number) => string;
    plannedStatus: string;
    whyButton: string;
    why: {
      title: string;
      subtitle: string;
      demandSources: string;
      grossCoveredDemand: string;
      coverageAndTarget: string;
      balanceBeforeTrigger: string;
      inventoryConsumed: string;
      incomingConsumed: string;
      safetyTarget: string;
      expiredExcluded: string;
      purchaseRequirement: string;
      timing: string;
      deliveryScheduled: string;
      firstRequirement: string;
      requirementsCovered: string;
      usableUntil: string;
      timingReasonShort: (days: number) => string;
      timingReasonMedium: (days: number) => string;
      timingReasonLong: (days: number) => string;
      supplierLabel: string;
      supplierPending: string;
      footnote: string;
    };
  };
  inventory: {
    planLabel: (version: number) => string;
    title: string;
    subtitle: string;
    openProcurement: string;
    statusExpiryRisk: string;
    statusLow: string;
    statusCovered: string;
    statusGood: string;
    columnIngredient: string;
    columnOnHand: string;
    columnSafetyTarget: string;
    columnConfirmedIncoming: string;
    columnNextRequirement: string;
    columnStatus: string;
    noRequirement: string;
  };
  mockSupplier: {
    prepareOrder: string;
    badge: string;
    planLabel: (version: number) => string;
    subtitle: string;
    closeAria: string;
    matching: string;
    productMatching: string;
    linesResolved: (matched: number, total: number) => string;
    decisions: (n: number) => string;
    complete: string;
    approvalSubstitution: string;
    need: (quantity: string) => string;
    unavailable: string;
    preferred: (name: string, quantity: string) => string;
    availableReplacement: string;
    replacementSupplies: (packages: number, packageSize: string, supplied: string) => string;
    syntheticPrice: string;
    approveReplacement: string;
    matchingComplete: string;
    reviewRoundingTitle: string;
    reviewRoundingBody: string;
    reviewCartPreview: string;
    approvalCartMutation: string;
    cartPreviewTitle: string;
    packages: (n: number) => string;
    suppliedSurplus: (supplied: string, surplus: string) => string;
    productsAndDelivery: string;
    total: string;
    approveAndApplyCart: string;
    onlyThisClickMutates: string;
    cartAppliedTitle: string;
    cartAppliedSummary: (lines: number, total: string) => string;
    activityTrace: string;
  };
  notFound: {
    eyebrow: string;
    title: string;
    body: string;
    backToOverview: string;
    openProcurement: string;
  };
  errorPage: {
    eyebrow: string;
    title: string;
    body: string;
    tryAgain: string;
    backToOverview: string;
  };
  loadingPage: {
    label: string;
  };
  agentTools: {
    readEvent: (name: string, guests: number) => string;
    readBatch: (date: string, lines: number) => string;
    readPlan: (version: number, batches: number) => string;
    explained: (ingredient: string, batchId: string, sources: number) => string;
    previewed: (before: number, after: number) => string;
    applied: (eventName: string, guests: number, planVersion: number) => string;
    supplierPrepared: (date: string, matched: number, total: number, unresolved: number) => string;
  };
  localAgent: {
    alreadySet: (guests: number) => string;
    previewReady: (
      before: number,
      after: number,
      planVersion: number,
      ingredientCount: number,
      batchCount: number,
    ) => string;
    explanationIntro: (ingredient: string, batchId: string, gross: string, sources: string) => string;
    explanationDetails: (inventory: string, incoming: string, safety: string, purchase: string) => string;
    planSummary: (version: number, start: string, end: string, batches: number) => string;
    noSupplierBatch: string;
    fallback: string;
  };
  supplierActivity: {
    matchedPartial: (matched: number, total: number, unresolved: number) => string;
    matchedAll: (total: number) => string;
    approvedSubstitution: (product: string, ingredient: string) => string;
    cartPreviewPrepared: string;
    cartApplyApproved: string;
    cartVerified: string;
  };
}
