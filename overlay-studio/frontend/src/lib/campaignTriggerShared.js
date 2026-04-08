/**
 * Legacy triggerConfig.frequencyCap string values (once_per_session, …) are still
 * honored when campaign.frequencyCap JSON is null. Prefer configuring caps in the
 * campaign builder (frequency_cap_type + limits) or recommendation set editor.
 * Storefront: overlay-engine + GET /proxy/* with optional freq_state.
 */
