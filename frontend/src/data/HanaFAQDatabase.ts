// Comprehensive FAQ Database for Hana
// Dynamic, bilingual (English/中文), organized by topics
// All content is neutral, legal-safe, accessible, and warm

export type Language = 'en' | 'zh' | 'yue';

export interface FAQItem {
  id: string;
  category: string;
  question: Record<Language, string>;
  answer: Record<Language, string>;
  tags: string[];
  relatedErrandStatus?: string[]; // Show when errand is in these statuses
}

export const FAQ_TOPICS = {
  'posting-errand': '📝 Posting an Errand',
  'bidding-accepting': '🤝 Bidding & Accepting',
  'payment-wallet': '💰 Payment & Wallet',
  'account-profile': '👤 Account & Profile',
  'safety-trust': '🛡️ Safety & Trust',
  'disputes-issues': '⚠️ Disputes & Issues',
  'points-rewards': '⭐ Points & Rewards',
  'cancel-refund': '↩️ Cancellation & Refunds',
  'ratings-reviews': '⭐ Ratings & Reviews',
  'refer-earn': '🎁 Referrals & Earnings',
  'technical-help': '🔧 Technical Help',
  'company-features': '🏢 Company Features',
};

export const COMPREHENSIVE_FAQ: FAQItem[] = [
  // ===== POSTING AN ERRAND (5+) =====
  {
    id: 'post-errand-basic',
    category: 'posting-errand',
    question: {
      en: 'How do I post an errand?',
      zh: '我如何发布任务？',
      yue: '我點樣發佈幫幫？',
    },
    answer: {
      en: 'Great question! Posting an errand is super simple:\n\n1. Tap the "+" button at the bottom of your screen\n2. Choose "Post an Errand" and describe what you need\n3. Set a clear title and detailed description (include photos if helpful!)\n4. Set your budget and when you need it done\n5. Choose errand category (cleaning, delivery, tech help, etc.)\n6. Review and submit!\n\nOnce posted, doers will start sending you bids. You can choose whoever you think is the best fit for your task. Pretty simple, right? 😊',
      zh: '好问题！发布任务非常简单：\n\n1. 点击屏幕底部的"+"按钮\n2. 选择"发布帮帮"并描述你需要的帮助\n3. 设定清晰的标题和详细描述（如果有帮助，可以包括照片！）\n4. 设定预算和你需要完成的时间\n5. 选择帮帮类别（清洁、送货、技术帮助等）\n6. 审查并提交！\n\n一旦发布，帮手会开始向你发送出价。你可以选择你认为最适合你任务的人。很简单吧？😊',
      yue: '好問題！發佈幫幫非常簡單：\n\n1. 點擊屏幕底部嘅"+"按鈕\n2. 選擇"發佈幫幫"並描述你需要嘅幫助\n3. 設定清晰嘅標題同詳細描述（如果有幫助，可以包括相片！）\n4. 設定預算同你需要完成嘅時間\n5. 選擇幫幫類別（清潔、送貨、技術幫助等）\n6. 審查並提交！\n\n一旦發佈，幫手會開始向你發送出價。你可以選擇你認為最適合你任務嘅人。好簡單啦！😊',
    },
    tags: ['beginner', 'posting', 'step-by-step'],
    relatedErrandStatus: ['draft', 'posted'],
  },
  {
    id: 'post-detailed-description',
    category: 'posting-errand',
    question: {
      en: 'What should I include in my errand description?',
      zh: '我应该在任务描述中包括什么？',
      yue: '我應該喺幫幫描述入面包括咩？',
    },
    answer: {
      en: 'The more details you provide, the better bids you\'ll get! Here\'s what works well:\n\n✓ Be specific: Instead of "cleaning", say "3-room apartment deep clean, focus on kitchen"\n✓ Set clear expectations: What exactly needs to be done? What\'s included?\n✓ Mention special requirements: Allergies, pet-friendly tools, specific brands, etc.\n✓ Add photos: A picture is worth 1000 words! Show what needs work\n✓ Be honest about difficulty: Is this a simple task or complex?\n✓ Mention location details: Parking, building access, etc.\n✓ Specify deadline: "Today by 6pm" vs "sometime this week"\n\nClear descriptions = Better bids = Happier outcomes! 🎯',
      zh: '你提供的细节越多，你得到的出价就越好！以下是有效的方法：\n\n✓ 具体一点：不是"清洁"，而是"3室公寓深层清洁，重点是厨房"\n✓ 设定清晰的期望：具体需要做什么？包括什么？\n✓ 提及任何特殊要求：过敏症、宠物友好工具、特定品牌等\n✓ 添加照片：一张图片胜过一千个词！展示需要工作的地方\n✓ 诚实说明难度：这是一个简单的任务还是复杂的任务？\n✓ 提及位置细节：停车、建筑物进出等\n✓ 指定截止日期："今天下午6点前"与"这周某个时候"\n\n清晰的描述=更好的出价=更幸福的结果！🎯',
      yue: '你提供嘅細節越多，你得到嘅出價就越好！以下係有效嘅方法：\n\n✓ 具體啲：唔係"清潔"，而係"3室公寓深層清潔，重點係廚房"\n✓ 設定清晰嘅期望：具體需要做咩？包括咩？\n✓ 提及任何特殊要求：過敏症、寵物友好工具、特定品牌等\n✓ 添加相片：一張圖片勝過一千個詞！展示需要工作嘅地方\n✓ 誠實說明難度：呢個係一個簡單嘅任務定係複雜嘅任務？\n✓ 提及位置細節：停車、建築物進出等\n✓ 指定截止日期："今日下午6點前"與"呢個星期某個時候"\n\n清晰嘅描述=更好嘅出價=更幸福嘅結果！🎯',
    },
    tags: ['posting', 'tips', 'best-practices'],
    relatedErrandStatus: ['draft'],
  },
  {
    id: 'post-price-budget',
    category: 'posting-errand',
    question: {
      en: 'How do I set a fair budget for my errand?',
      zh: '我如何为任务设定合理的预算？',
      yue: '我點樣為幫幫設定合理嘅預算？',
    },
    answer: {
      en: 'Setting the right budget helps you get quality bids! Here\'s our guide:\n\n📊 Research first: Look at similar errands posted to see what\'s typical\n💭 Consider complexity: Simple tasks = lower budget, complex tasks = higher budget\n⏰ Think about time: Longer jobs or rush requests may cost more\n🌍 Factor in location: Urban areas might be pricier than suburbs\n🤝 Respect the doers: Remember, these are real people doing real work\n\nTip: You can see suggested budget ranges when posting. Start with the suggested range and adjust based on urgency and complexity.\n\nRemember: A slightly higher budget often means better quality work and faster service! 💪',
      zh: '设定正确的预算有助于获得优质出价！以下是我们的指南：\n\n📊 先研究：查看类似的已发布任务，了解典型价格\n💭 考虑复杂性：简单任务=较低预算，复杂任务=较高预算\n⏰ 考虑时间：较长的工作或紧急请求可能成本更高\n🌍 考虑位置因素：城市地区可能比郊区更昂贵\n🤝 尊重帮手：记住，这些是做真实工作的真实的人\n\n提示：发布时，你可以看到建议的预算范围。从建议范围开始，根据紧迫性和复杂性进行调整。\n\n记住：稍高的预算通常意味着更好的工作质量和更快的服务！💪',
      yue: '設定正確嘅預算有助於獲得優質出價！以下係我哋嘅指南：\n\n📊 先研究：查睇類似嘅已發佈幫幫，了解典型價格\n💭 考慮複雜性：簡單任務=較低預算，複雜任務=較高預算\n⏰ 考慮時間：較長嘅工作或緊急請求可能成本更高\n🌍 考慮位置因素：城市地區可能比郊區更昂貴\n🤝 尊重幫手：記住，呢啲係做真實工作嘅真實嘅人\n\n提示：發佈時，你可以睇到建議嘅預算範圍。由建議範圍開始，根據緊迫性同複雜性進行調整。\n\n記住：稍高嘅預算通常意味著更好嘅工作質量同更快嘅服務！💪',
    },
    tags: ['posting', 'budget', 'pricing'],
    relatedErrandStatus: ['draft'],
  },
  {
    id: 'post-edit-errand',
    category: 'posting-errand',
    question: {
      en: 'Can I edit my errand after posting?',
      zh: '发布后我可以编辑我的任务吗？',
      yue: '發佈後我可以編輯我嘅幫幫嗎？',
    },
    answer: {
      en: 'Yes! You can edit your errand at any time before someone accepts your bid. Simply:\n\n1. Go to your errand details\n2. Tap "Edit"\n3. Make your changes to the description, budget, or deadline\n4. Save changes\n\nOnce a doer accepts your bid, you can\'t edit major details, but you can still communicate with them through the app chat. If you need to cancel, follow the cancellation process.\n\nTip: Edit early if needed! The sooner doers see your final description, the better bids you\'ll receive. ✏️',
      zh: '是的！在有人接受你的出价之前，你可以随时编辑你的任务。只需：\n\n1. 转到你的任务详情\n2. 点击"编辑"\n3. 对描述、预算或截止日期进行更改\n4. 保存更改\n\n一旦帮手接受你的出价，你就不能编辑主要细节，但你仍然可以通过应用聊天与他们交流。如果你需要取消，请遵循取消流程。\n\n提示：如果需要，请提前编辑！帮手越早看到你的最终描述，你就会收到更好的出价。✏️',
      yue: '係呀！喺有人接受你嘅出價之前，你可以隨時編輯你嘅幫幫。只需：\n\n1. 轉到你嘅幫幫詳情\n2. 點擊"編輯"\n3. 對描述、預算或截止日期進行更改\n4. 保存更改\n\n一旦幫手接受你嘅出價，你就唔能編輯主要細節，但你仍然可以通過應用聊天與佢哋交流。如果你需要取消，請遵循取消流程。\n\n提示：如果需要，請提前編輯！幫手越早睇到你嘅最終描述，你就會收到更好嘅出價。✏️',
    },
    tags: ['posting', 'editing', 'tips'],
    relatedErrandStatus: ['posted', 'bidding'],
  },
  {
    id: 'post-duplicate-errand',
    category: 'posting-errand',
    question: {
      en: 'What is the best time to post an errand?',
      zh: '发布任务的最佳时间是什么？',
      yue: '發佈幫幫嘅最佳時間係咩？',
    },
    answer: {
      en: 'Timing matters! Here\'s when you\'ll get the best results:\n\n🌞 Weekday mornings (8-10am): Doers are starting their day\n☀️ Lunch time (11am-1pm): Many are checking available tasks\n🌅 Early evening (4-6pm): Peak activity time for bidding\n📅 Weekdays vs Weekends: Weekdays get more bids, especially for services\n\nAvoid posting late at night or very early morning - you\'ll get fewer bids.\n\nHowever, if your errand is urgent, post immediately! A good urgent errand will attract doers even at off-peak times. 🚀\n\nTip: Check when doers are active in your area by looking at recent bid timestamps!',
      zh: '时间很重要！以下是你会得到最好结果的时候：\n\n🌞 工作日早上（8-10点）：帮手开始他们的一天\n☀️ 午餐时间（11点-1点）：许多人在检查可用任务\n🌅 傍晚（下午4-6点）：出价的峰值时间\n📅 工作日对周末：工作日获得更多出价，特别是对于服务\n\n避免在深夜或很早的早上发布 - 你会收到更少的出价。\n\n但是，如果你的任务很紧急，立即发布！一个好的紧急任务即使在非高峰时间也会吸引帮手。🚀\n\n提示：通过查看最近的出价时间戳来检查帮手在你的地区何时活跃！',
      yue: '時間好重要！以下係你會得到最好結果嘅時候：\n\n🌞 工作日早上（8-10點）：幫手開始佢哋嘅一天\n☀️ 午餐時間（11點-1點）：好多人喺檢查可用任務\n🌅 傍晚（下午4-6點）：出價嘅峰值時間\n📅 工作日對周末：工作日獲得更多出價，特別係對於服務\n\n避免喺深夜或好早嘅早上發佈 - 你會收到更少嘅出價。\n\n但係，如果你嘅幫幫好緊急，立即發佈！一個好嘅緊急幫幫即使喺非高峰時間都會吸引幫手。🚀\n\n提示：通過查睇最近嘅出價時間戳嚟檢查幫手喺你嘅地區何時活躍！',
    },
    tags: ['posting', 'timing', 'strategy'],
    relatedErrandStatus: ['posted'],
  },

  // ===== BIDDING & ACCEPTING (5+) =====
  {
    id: 'bidding-how-works',
    category: 'bidding-accepting',
    question: {
      en: 'How does bidding work on Errandify?',
      zh: '在帮帮乐上出价是如何运作的？',
      yue: '喺帮帮乐上出價係點樣運作嘅？',
    },
    answer: {
      en: 'Bidding is how doers show their interest in doing your errand! Here\'s the flow:\n\n1. You post an errand with details and budget\n2. Doers see your errand and can place a bid\n3. You review all the bids, doer profiles, and ratings\n4. You choose your preferred doer by accepting their bid\n5. Work begins - you and your doer coordinate and complete the task\n6. Payment happens once work is approved\n\nYou\'re in control! You only pay when you\'re happy with the work. Think of it like hiring the person you feel most confident about. 💼\n\nPro tip: High ratings and completed jobs often means the doer is reliable!',
      zh: '出价是帮手表示对你的帮帮感兴趣的方式！流程如下：\n\n1. 你发布一个有详细信息和预算的帮帮\n2. 帮手看到你的帮帮并可以出价\n3. 你审查所有出价、帮手档案和评级\n4. 你选择你首选的帮手来接受他们的出价\n5. 工作开始 - 你和你的帮手协调并完成任务\n6. 支付发生 一旦工作被批准\n\n你掌握权力！你只有在满意工作时才会支付。把它想象成招聘你最有信心的人。💼\n\n专业提示：高评级和已完成的工作通常意味着帮手是可靠的！',
      yue: '出價係帮手表示對你嘅幫幫感興趣嘅方式！流程如下：\n\n1. 你發佈一個有詳細信息同預算嘅幫幫\n2. 幫手睇到你嘅幫幫並可以出價\n3. 你審查所有出價、幫手檔案同評級\n4. 你選擇你首選嘅幫手嚟接受佢哋嘅出價\n5. 工作開始 - 你同你嘅幫手協調同完成任務\n6. 支付發生 一旦工作被批准\n\n你掌握權力！你只有喺滿意工作時先會支付。把佢想像成招聘你最有信心嘅人。💼\n\n專業提示：高評級同已完成嘅工作通常意味著幫手係可靠嘅！',
    },
    tags: ['bidding', 'how-it-works', 'beginner'],
    relatedErrandStatus: ['posted', 'bidding'],
  },
  {
    id: 'accept-best-bid',
    category: 'bidding-accepting',
    question: {
      en: 'How do I choose the best bid?',
      zh: '我如何选择最好的出价？',
      yue: '我點樣選擇最好嘅出價？',
    },
    answer: {
      en: 'Choosing the right doer is important! Here\'s what to look at:\n\n⭐ Ratings & Reviews: Look at their star rating and what others say\n✓ Completed Jobs: How many errands have they successfully completed?\n💬 Bid Message: Some doers add a note - read it! Shows they care\n💰 Price: Is it competitive? Too low might mean low quality, too high isn\'t necessary\n👤 Profile: Check out their profile - do they seem trustworthy?\n🎯 Relevant Experience: Have they done similar work before?\n\nOur tip: Don\'t always pick the cheapest! Mid-range bids with good ratings often give the best value. A slightly higher price often means better quality and reliability.\n\nTrust your gut! If their profile feels right, they probably are. 🎯',
      zh: '选择合适的帮手很重要！以下是要看的：\n\n⭐ 评级与评论：查看他们的星级评分和他人的评论\n✓ 已完成的工作：他们已成功完成多少项帮帮？\n💬 出价信息：一些帮手会添加备注 - 阅读它！显示他们很在乎\n💰 价格：它有竞争力吗？太低可能意味着质量低，太高没必要\n👤 档案：查看他们的档案 - 他们看起来值得信赖吗？\n🎯 相关经验：他们之前做过类似的工作吗？\n\n我们的提示：不要总是选择最便宜的！中等价位的出价加上好评通常能提供最佳价值。稍高的价格通常意味着更好的质量和可靠性。\n\n相信你的直觉！如果他们的档案感觉不错，他们可能就是。🎯',
      yue: '選擇合適嘅幫手好重要！以下係要睇嘅：\n\n⭐ 評級與評論：查睇佢哋嘅星級評分同他人嘅評論\n✓ 已完成嘅工作：佢哋已成功完成幾多項幫幫？\n💬 出價信息：一啲幫手會添加備註 - 閱讀佢！顯示佢哋好在乎\n💰 價格：佢有競爭力嗎？太低可能意味著質量低，太高冇必要\n👤 檔案：查睇佢哋嘅檔案 - 佢哋睇起來值得信賴嗎？\n🎯 相關經驗：佢哋之前做過類似嘅工作嗎？\n\n我哋嘅提示：唔好淨係選擇最便宜嘅！中等價位嘅出價加上好評通常能提供最佳價值。稍高嘅價格通常意味著更好嘅質量同可靠性。\n\n相信你嘅直覺！如果佢哋嘅檔案感覺唔錯，佢哋可能就係。🎯',
    },
    tags: ['bidding', 'tips', 'best-practices'],
    relatedErrandStatus: ['bidding'],
  },
  {
    id: 'accept-bid-process',
    category: 'bidding-accepting',
    question: {
      en: 'How do I accept a bid?',
      zh: '我如何接受出价？',
      yue: '我點樣接受出價？',
    },
    answer: {
      en: 'Accepting a bid is easy! Here\'s how:\n\n1. Review the bids you\'ve received\n2. Click on the doer\'s profile to learn more about them\n3. Read their bid message and check their reviews\n4. When you\'re ready, tap "Accept Bid"\n5. The doer will be notified and work coordination begins\n6. You\'ll have a chat room to communicate details\n\nOnce accepted, the payment is held securely. The doer will then reach out to confirm details, arrange timing, and complete the work.\n\nRemember: You only release payment after you approve the completed work! 💰',
      zh: '接受出价很容易！以下是如何操作：\n\n1. 审查你收到的出价\n2. 点击帮手的档案以了解更多关于他们的信息\n3. 阅读他们的出价信息并检查他们的评论\n4. 当你准备好时，点击"接受出价"\n5. 帮手将收到通知，工作协调开始\n6. 你将有一个聊天室来沟通细节\n\n一旦接受，付款将被安全地保管。帮手随后将与你联系以确认细节、安排时间并完成工作。\n\n记住：你只有在批准完成的工作后才会释放付款！💰',
      yue: '接受出價好容易！以下係點樣操作：\n\n1. 審查你收到嘅出價\n2. 點擊幫手嘅檔案以了解更多關於佢哋嘅信息\n3. 閱讀佢哋嘅出價信息並檢查佢哋嘅評論\n4. 當你準備好時，點擊"接受出價"\n5. 幫手將收到通知，工作協調開始\n6. 你將有一個聊天室嚟溝通細節\n\n一旦接受，付款將被安全地保管。幫手隨後將與你聯繫以確認細節、安排時間並完成工作。\n\n記住：你只有喺批准完成嘅工作後先會釋放付款！💰',
    },
    tags: ['bidding', 'accepting', 'step-by-step'],
    relatedErrandStatus: ['bidding'],
  },
  {
    id: 'multiple-bids-strategy',
    category: 'bidding-accepting',
    question: {
      en: 'What if I receive multiple bids? Which should I choose?',
      zh: '如果我收到多个出价怎么办？我应该选择哪一个？',
      yue: '如果我收到多個出價點樣辦？我應該選擇邊個？',
    },
    answer: {
      en: 'Getting multiple bids is great! It means doers are interested in your work. Here\'s how to decide:\n\n📊 Compare systematically:\n• Line them up by rating (highest first)\n• Then by price (within your budget)\n• Then by experience (relevant jobs completed)\n\n🎯 Make your decision based on:\n• 50% reputation (ratings + reviews + completed jobs)\n• 30% price (fair and competitive)\n• 20% communication (did they understand your needs?)\n\n💡 Pro tips:\n• Don\'t just pick the cheapest\n• Read recent reviews for current performance\n• Check if they\'ve done similar work\n• A slightly higher price often means better results\n\nTrust your instinct! The right doer is usually obvious after comparing a few profiles. ⭐',
      zh: '获得多个出价很好！这意味着帮手对你的工作感兴趣。以下是如何决定的：\n\n📊 系统地比较：\n• 按评级列出它们（最高优先）\n• 然后按价格（在您的预算范围内）\n• 然后按经验（相关工作已完成）\n\n🎯 根据以下内容做出决定：\n• 50% 声誉（评级 + 评论 + 已完成的工作）\n• 30% 价格（公平且有竞争力）\n• 20% 沟通（他们理解你的需求吗？）\n\n💡 专业提示：\n• 不要仅仅选择最便宜的\n• 阅读最近的评论以了解当前表现\n• 检查他们是否做过类似的工作\n• 稍高的价格通常意味着更好的结果\n\n相信你的直觉！比较几个档案后，合适的帮手通常很明显。⭐',
      yue: '獲得多個出價好好！呢意味著幫手對你嘅工作感興趣。以下係點樣決定嘅：\n\n📊 系統地比較：\n• 按評級列出佢哋（最高優先）\n• 然後按價格（喺你嘅預算範圍內）\n• 然後按經驗（相關工作已完成）\n\n🎯 根據以下內容做出決定：\n• 50% 聲譽（評級 + 評論 + 已完成嘅工作）\n• 30% 價格（公平且有競爭力）\n• 20% 溝通（佢哋理解你嘅需求嗎？）\n\n💡 專業提示：\n• 唔好淨係選擇最便宜嘅\n• 閱讀最近嘅評論以了解當前表現\n• 檢查佢哋係咪做過類似嘅工作\n• 稍高嘅價格通常意味著更好嘅結果\n\n相信你嘅直覺！比較幾個檔案後，合適嘅幫手通常好明顯。⭐',
    },
    tags: ['bidding', 'choosing', 'strategy'],
    relatedErrandStatus: ['bidding'],
  },

  // ===== PAYMENT & WALLET (5+) =====
  {
    id: 'payment-how-safe',
    category: 'payment-wallet',
    question: {
      en: 'Is my payment safe? When do I pay?',
      zh: '我的付款安全吗？我什么时候付款？',
      yue: '我嘅付款安全嗎？我幾時付款？',
    },
    answer: {
      en: 'Your payment is completely safe! Here\'s how it works:\n\n🛡️ Protected Process: Your money stays with us until work is done and approved\n\n💰 Payment flow:\n1. You accept a bid\n2. We hold the payment securely in escrow\n3. Doer completes the work\n4. You approve the work (after checking quality)\n5. Payment is released to the doer\n6. You\'re both happy!\n\n✅ You\'re protected: If there\'s an issue, we\'re here to help. No payment leaves your account without your approval.\n\n🔒 Security: We use industry-standard encryption and payment processors. Your payment information is never shared with the doer.\n\nKey point: You never pay upfront. You only pay after you\'re satisfied with the work! This is your protection. 💪',
      zh: '你的付款完全安全！下面是它的工作原理：\n\n🛡️ 受保护的流程：你的钱在我们这里保管，直到工作完成并得到批准\n\n💰 付款流程：\n1. 你接受一个出价\n2. 我们安全地在第三方托管中保管付款\n3. 帮手完成工作\n4. 你批准工作（检查质量后）\n5. 付款被释放给帮手\n6. 你们都很高兴！\n\n✅ 你受保护：如果有问题，我们会帮你。没有你的批准，任何付款都不会离开你的账户。\n\n🔒 安全性：我们使用行业标准的加密和支付处理器。你的付款信息从不与帮手共享。\n\n关键点：你永远不需要预先付款。你只在满意工作后才付款！这是你的保护。💪',
      yue: '你嘅付款完全安全！下面係佢嘅工作原理：\n\n🛡️ 受保護嘅流程：你嘅錢喺我哋呢度保管，直到工作完成並得到批准\n\n💰 付款流程：\n1. 你接受一個出價\n2. 我哋安全地喺第三方托管中保管付款\n3. 幫手完成工作\n4. 你批准工作（檢查質量後）\n5. 付款被釋放畀幫手\n6. 你哋都好開心！\n\n✅ 你受保護：如果有問題，我哋會幫你。冇你嘅批准，任何付款都唔會離開你嘅賬戶。\n\n🔒 安全性：我哋使用行業標準嘅加密同支付處理器。你嘅付款信息從唔與幫手共享。\n\n關鍵點：你永遠唔需要預先付款。你只喺滿意工作後先付款！呢個係你嘅保護。💪',
    },
    tags: ['payment', 'security', 'trust'],
    relatedErrandStatus: ['accepted', 'in-progress', 'completed'],
  },
  {
    id: 'wallet-balance',
    category: 'payment-wallet',
    question: {
      en: 'How do I check my wallet balance and add money?',
      zh: '我如何检查我的钱包余额并添加金钱？',
      yue: '我點樣檢查我嘅錢包結餘同添加金錢？',
    },
    answer: {
      en: 'Managing your wallet is easy!\n\n📱 Check your balance:\n1. Tap your profile icon (bottom right)\n2. Select "Wallet" or "My Wallet"\n3. You\'ll see your current balance and transaction history\n\n💳 Add money:\n1. Go to your Wallet\n2. Tap "Add Money" or "Top Up"\n3. Choose your amount\n4. Select payment method (credit card, debit card, bank transfer, etc.)\n5. Confirm and your money is added!\n\n✨ Bonus: Your wallet stays loaded, so you\'re always ready to pay quickly when you accept a bid.\n\n📊 Transaction history: You can see all your past payments and refunds anytime.\n\nAll transactions are secure and encrypted! 🔒',
      zh: '管理你的钱包很容易！\n\n📱 检查你的余额：\n1. 点击你的档案图标（右下角）\n2. 选择"钱包"或"我的钱包"\n3. 你会看到你的当前余额和交易历史\n\n💳 添加金钱：\n1. 转到你的钱包\n2. 点击"添加金钱"或"充值"\n3. 选择你的金额\n4. 选择支付方法（信用卡、借记卡、银行转账等）\n5. 确认，你的金钱就被添加了！\n\n✨ 奖励：你的钱包保持充足状态，所以你总是准备好在接受出价时快速支付。\n\n📊 交易历史：你可以随时查看所有过去的付款和退款。\n\n所有交易都是安全和加密的！🔒',
      yue: '管理你嘅錢包好容易！\n\n📱 檢查你嘅結餘：\n1. 點擊你嘅檔案圖標（右下角）\n2. 選擇"錢包"或"我嘅錢包"\n3. 你會睇到你嘅當前結餘同交易歷史\n\n💳 添加金錢：\n1. 轉到你嘅錢包\n2. 點擊"添加金錢"或"充值"\n3. 選擇你嘅金額\n4. 選擇支付方法（信用卡、借記卡、銀行轉賬等）\n5. 確認，你嘅金錢就被添加咗！\n\n✨ 獎勵：你嘅錢包保持充足狀態，所以你總係準備好喺接受出價時快速支付。\n\n📊 交易歷史：你可以隨時查睇所有過去嘅付款同退款。\n\n所有交易都係安全同加密嘅！🔒',
    },
    tags: ['wallet', 'payment', 'top-up'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'payment-methods',
    category: 'payment-wallet',
    question: {
      en: 'What payment methods do you accept?',
      zh: '你们接受哪些付款方式？',
      yue: '你哋接受邊啲付款方式？',
    },
    answer: {
      en: 'We accept multiple secure payment methods for your convenience:\n\n💳 Credit & Debit Cards:\n• Visa, Mastercard, American Express\n• All cards are encrypted and secure\n• Instant processing\n\n🏦 Bank Transfers:\n• Direct bank-to-bank transfers\n• Takes 1-2 business days\n• No additional fees\n\n📱 Digital Wallets:\n• Apple Pay, Google Pay\n• Instant and secure\n• One-tap payment\n\n🔒 Security:\n• All transactions are encrypted\n• PCI DSS compliant\n• Your card details are never stored on our servers\n• We use trusted payment processors\n\nTip: Save your preferred payment method for faster checkout next time! ⚡',
      zh: '我们为您的方便接受多种安全付款方式：\n\n💳 信用卡和借记卡：\n• Visa、万事达卡、美国运通\n• 所有卡都经过加密和安全\n• 即时处理\n\n🏦 银行转账：\n• 直接的银行对银行转账\n• 需要1-2个工作日\n• 无额外费用\n\n📱 数字钱包：\n• Apple Pay、Google Pay\n• 即时且安全\n• 一键付款\n\n🔒 安全性：\n• 所有交易都经过加密\n• 符合PCI DSS标准\n• 我们的服务器从不存储您的卡详情\n• 我们使用可信的支付处理器\n\n提示：保存您首选的付款方式，以便下次更快地结账！⚡',
      yue: '我哋為你嘅方便接受多種安全付款方式：\n\n💳 信用卡同借記卡：\n• Visa、萬事達卡、美國運通\n• 所有卡都經過加密同安全\n• 即時處理\n\n🏦 銀行轉賬：\n• 直接嘅銀行對銀行轉賬\n• 需要1-2個工作日\n• 冇額外費用\n\n📱 數字錢包：\n• Apple Pay、Google Pay\n• 即時且安全\n• 一鍵付款\n\n🔒 安全性：\n• 所有交易都經過加密\n• 符合PCI DSS標準\n• 我哋嘅服務器從唔存儲你嘅卡詳情\n• 我哋使用可信嘅支付處理器\n\n提示：保存你首選嘅付款方式，以便下次更快地結賬！⚡',
    },
    tags: ['payment', 'methods', 'security'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'refund-process',
    category: 'payment-wallet',
    question: {
      en: 'How long does it take to get a refund?',
      zh: '获得退款需要多长时间？',
      yue: '獲得退款需要幾長時間？',
    },
    answer: {
      en: 'Refunds are processed quickly! Here\'s the timeline:\n\n⚡ Instant Refunds (immediately):\n• Disputes resolved in your favor\n• Cancellation within 2 hours of acceptance\n• No-show doer\n\n📅 24-48 Hour Refunds:\n• Cancellation after 2 hours of acceptance\n• Payment disputes\n• Quality issues (after investigation)\n\n🏦 Bank Processing (2-5 business days):\n• The refund reaches your original payment method\n• Bank processing times vary\n• Credit card refunds sometimes appear as pending credits first\n\n💡 Pro tips:\n• Instant refunds go directly to your Errandify wallet\n• You can use wallet funds immediately\n• For bank account refunds, check your bank app\n\nCan\'t find your refund? Contact support@errandify.com with your order ID! 📧',
      zh: '退款处理很快！以下是时间表：\n\n⚡ 即时退款（立即）：\n• 纠纷对你有利\n• 接受后2小时内取消\n• 帮手不出现\n\n📅 24-48小时退款：\n• 接受后2小时后取消\n• 付款纠纷\n• 质量问题（调查后）\n\n🏦 银行处理（2-5个工作日）：\n• 退款到达您的原始付款方式\n• 银行处理时间各不相同\n• 信用卡退款有时首先显示为待决信用\n\n💡 专业提示：\n• 即时退款直接进入您的Errandify钱包\n• 您可以立即使用钱包资金\n• 对于银行账户退款，请检查您的银行应用\n\n找不到退款？请使用您的订单ID联系support@errandify.com！📧',
      yue: '退款處理好快！以下係時間表：\n\n⚡ 即時退款（立即）：\n• 爭議對你有利\n• 接受後2小時內取消\n• 幫手唔出現\n\n📅 24-48小時退款：\n• 接受後2小時後取消\n• 付款爭議\n• 質量問題（調查後）\n\n🏦 銀行處理（2-5個工作日）：\n• 退款到達你嘅原始付款方式\n• 銀行處理時間各唔相同\n• 信用卡退款有時首先顯示為待決信用\n\n💡 專業提示：\n• 即時退款直接進入你嘅Errandify錢包\n• 你可以立即使用錢包資金\n• 對於銀行賬戶退款，請檢查你嘅銀行應用\n\n搵唔到退款？請使用你嘅訂單ID聯繫support@errandify.com！📧',
    },
    tags: ['payment', 'refund', 'timeline'],
    relatedErrandStatus: ['any'],
  },

  // ===== ACCOUNT & PROFILE (5+) =====
  {
    id: 'account-setup',
    category: 'account-profile',
    question: {
      en: 'How do I set up my Errandify account?',
      zh: '我如何设置我的帮帮乐账户？',
      yue: '我點樣設置我嘅幫幫樂賬戶？',
    },
    answer: {
      en: 'Getting started is quick and easy!\n\n📝 Registration:\n1. Download the Errandify app or visit our website\n2. Tap "Sign Up"\n3. Enter your email or phone number\n4. Create a strong password\n5. Verify your email/phone (we send a code)\n\n👤 Complete your profile:\n1. Add a profile photo (smiling works great! 😊)\n2. Write a short bio (who you are, what you do)\n3. Add your location and availability\n4. Link a payment method\n\n✅ You\'re ready!\nNow you can post errands or start bidding on ones posted by others.\n\nPro tips:\n• Complete profile = More trust from other users\n• Verified phone = Extra safety badge\n• Profile photo = 3x more responses!\n\nWelcome to Errandify! We\'re excited to have you. 🎉',
      zh: '入门很快很容易！\n\n📝 注册：\n1. 下载帮帮乐应用或访问我们的网站\n2. 点击"注册"\n3. 输入你的电子邮件或电话号码\n4. 创建一个强密码\n5. 验证你的电子邮件/电话（我们会发送代码）\n\n👤 完成你的档案：\n1. 添加档案照片（微笑效果很好！😊）\n2. 写一个简短的自我介绍（你是谁，你做什么）\n3. 添加你的位置和可用时间\n4. 链接支付方法\n\n✅ 你准备好了！\n现在你可以发布帮帮或开始对其他人发布的帮帮进行出价。\n\n专业提示：\n• 完整的档案 = 其他用户更信任\n• 经过验证的电话 = 额外的安全徽章\n• 档案照片 = 反应增加3倍！\n\n欢迎来到帮帮乐！我们很高兴有你。🎉',
      yue: '入門好快好容易！\n\n📝 註冊：\n1. 下載幫幫樂應用或訪問我哋嘅網站\n2. 點擊"註冊"\n3. 輸入你嘅電子郵件或電話號碼\n4. 創建一個強密碼\n5. 驗證你嘅電子郵件/電話（我哋會發送代碼）\n\n👤 完成你嘅檔案：\n1. 添加檔案相片（微笑效果好好！😊）\n2. 寫一個簡短嘅自我介紹（你係誰，你做咩）\n3. 添加你嘅位置同可用時間\n4. 鏈接支付方法\n\n✅ 你準備好咗！\n而家你可以發佈幫幫或開始對其他人發佈嘅幫幫進行出價。\n\n專業提示：\n• 完整嘅檔案 = 其他用戶更信任\n• 經過驗證嘅電話 = 額外嘅安全徽章\n• 檔案相片 = 反應增加3倍！\n\n歡迎來到幫幫樂！我哋好高興有你。🎉',
    },
    tags: ['account', 'setup', 'beginner'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'profile-verification',
    category: 'account-profile',
    question: {
      en: 'What does account verification mean? How do I get verified?',
      zh: '账户验证是什么意思？我如何获得验证？',
      yue: '賬戶驗證係咩意思？我點樣獲得驗證？',
    },
    answer: {
      en: 'Verification builds trust on Errandify!\n\n✅ Why verify?\n• Shows other users you\'re legitimate\n• Gets you the ✓ verification badge\n• Increases job/bid success rates\n• Unlocks higher earning potential\n• Extra security for everyone\n\n📱 How to get verified:\n1. Go to your Profile\n2. Tap "Get Verified" or "Security"\n3. Follow these steps:\n   - Phone verification: Enter your phone number, confirm the code we send\n   - ID verification: Upload a photo of your ID (passport, license, etc.)\n   - Address verification: Confirm your address (we may send a postcard)\n   - Payment method: Link and verify a valid payment card\n\n✨ What happens next?\nWe review your information (usually within 24 hours). Once approved, you get the ✓ badge and full access to all features!\n\n🔒 Your information is safe: We use encryption and never share personal details with others.\n\nVerification is quick and builds confidence! 💪',
      zh: '验证在帮帮乐上建立信任！\n\n✅ 为什么要验证？\n• 向其他用户展示你是合法的\n• 获得✓验证徽章\n• 增加工作/出价成功率\n• 解锁更高的收入潜力\n• 为所有人提供额外安全\n\n📱 如何获得验证：\n1. 转到你的档案\n2. 点击"获得验证"或"安全性"\n3. 按照以下步骤：\n   - 电话验证：输入你的电话号码，确认我们发送的代码\n   - ID验证：上传你的ID照片（护照、驾照等）\n   - 地址验证：确认你的地址（我们可能会发送明信片）\n   - 支付方法：链接并验证有效的支付卡\n\n✨ 接下来会发生什么？\n我们审查你的信息（通常在24小时内）。获批后，你获得✓徽章并可以完全访问所有功能！\n\n🔒 你的信息是安全的：我们使用加密，从不与他人共享个人详情。\n\n验证既快又能建立信心！💪',
      yue: '驗證喺幫幫樂上建立信任！\n\n✅ 點解要驗證？\n• 向其他用戶展示你係合法嘅\n• 獲得✓驗證徽章\n• 增加工作/出價成功率\n• 解鎖更高嘅收入潛力\n• 為所有人提供額外安全\n\n📱 點樣獲得驗證：\n1. 轉到你嘅檔案\n2. 點擊"獲得驗證"或"安全性"\n3. 按照以下步驟：\n   - 電話驗證：輸入你嘅電話號碼，確認我哋發送嘅代碼\n   - ID驗證：上載你嘅ID相片（護照、駕駛執照等）\n   - 地址驗證：確認你嘅地址（我哋可能會發送明信片）\n   - 支付方法：鏈接並驗證有效嘅支付卡\n\n✨ 接下來會發生咩？\n我哋審查你嘅信息（通常喺24小時內）。獲批後，你獲得✓徽章並可以完全訪問所有功能！\n\n🔒 你嘅信息係安全嘅：我哋使用加密，從唔與他人共享個人詳情。\n\n驗證既快又能建立信心！💪',
    },
    tags: ['verification', 'security', 'account'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'profile-photo',
    category: 'account-profile',
    question: {
      en: 'Why is a profile photo important?',
      zh: '为什么档案照片很重要？',
      yue: '點樣檔案相片好重要？',
    },
    answer: {
      en: 'Your profile photo makes a huge difference! Here\'s why:\n\n📸 Benefits:\n• 3x more responses to your posts\n• Higher trust from other users\n• Better visibility when bidding\n• More profile clicks\n• Stronger personal connection\n\n📷 Best practices:\n✓ Clear, recent photo (within 6 months)\n✓ Good lighting (natural daylight works best)\n✓ Friendly expression (smile! 😊)\n✓ Head and shoulders visible\n✓ Professional but approachable\n✓ No filters or heavy editing\n✗ Avoid group photos\n✗ Avoid selfies with weird angles\n✗ Avoid very old photos\n\n💡 Pro tip:\n A good profile photo signals that you\'re serious and trustworthy. People do business with people, not with blank profiles!\n\nTake a new photo today and watch your responses increase! 📈',
      zh: '你的档案照片会产生巨大影响！原因如下：\n\n📸 好处：\n• 对你的帖子的回应增加3倍\n• 来自其他用户的更高信任\n• 出价时的更好可见性\n• 更多的档案点击\n• 更强的个人联系\n\n📷 最佳实践：\n✓ 清晰、最近的照片（在6个月内）\n✓ 良好的照明（自然日光效果最好）\n✓ 友好的表情（微笑！😊）\n✓ 可见头肩\n✓ 专业但平易近人\n✓ 无滤镜或大量编辑\n✗ 避免群组照片\n✗ 避免奇怪角度的自拍\n✗ 避免非常旧的照片\n\n💡 专业提示：\n一张好的档案照片表明你是认真和值得信赖的。人们与人做生意，而不是与空白档案做生意！\n\n今天拍一张新照片，看看你的回应增加！📈',
      yue: '你嘅檔案相片會產生巨大影響！原因如下：\n\n📸 好處：\n• 對你嘅貼文嘅回應增加3倍\n• 來自其他用戶嘅更高信任\n• 出價時嘅更好可見性\n• 更多嘅檔案點擊\n• 更強嘅個人聯繫\n\n📷 最佳實踐：\n✓ 清晰、最近嘅相片（喺6個月內）\n✓ 良好嘅照明（自然日光效果最好）\n✓ 友好嘅表情（微笑！😊）\n✓ 可見頭肩\n✓ 專業但平易近人\n✓ 冇濾鏡或大量編輯\n✗ 避免群組相片\n✗ 避免奇怪角度嘅自拍\n✗ 避免非常舊嘅相片\n\n💡 專業提示：\n一張好嘅檔案相片表明你係認真同值得信賴嘅。人哋與人做生意，而唔係與空白檔案做生意！\n\n今日拍一張新相片，睇睇你嘅回應增加！📈',
    },
    tags: ['profile', 'photo', 'tips'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'password-reset',
    category: 'account-profile',
    question: {
      en: 'How do I reset my password?',
      zh: '我如何重置我的密码？',
      yue: '我點樣重置我嘅密碼？',
    },
    answer: {
      en: 'Forgot your password? No problem! Here\'s how to reset it:\n\n🔐 Step-by-step:\n1. Go to the login page\n2. Tap "Forgot Password?"\n3. Enter your email or phone number\n4. We\'ll send you a reset code (check your email/SMS)\n5. Enter the code on the next page\n6. Create a new strong password\n7. Confirm and you\'re done!\n\n✨ Password tips:\n✓ Use at least 8 characters\n✓ Mix uppercase, lowercase, numbers, symbols\n✓ Avoid personal information (name, DOB, etc.)\n✓ Don\'t use the same password as other apps\n✓ Change periodically (every 3 months)\n\n🛡️ Security reminders:\n• Never share your password with anyone\n• Don\'t save it in plain text\n• Use a password manager if possible\n• If you suspect hacking, reset immediately\n\nIf you don\'t receive the reset email, check your spam folder! 📧',
      zh: '忘记了您的密码？没问题！以下是重置方式：\n\n🔐 分步：\n1. 转到登录页面\n2. 点击"忘记密码？"\n3. 输入你的电子邮件或电话号码\n4. 我们会向你发送重置代码（检查你的电子邮件/短信）\n5. 在下一页上输入代码\n6. 创建新的强密码\n7. 确认，你就完成了！\n\n✨ 密码提示：\n✓ 至少使用8个字符\n✓ 混合大写、小写、数字、符号\n✓ 避免个人信息（名字、出生日期等）\n✓ 不要使用与其他应用相同的密码\n✓ 定期更改（每3个月）\n\n🛡️ 安全提醒：\n• 永远不要与任何人分享你的密码\n• 不要以纯文本形式保存\n• 如果可能，使用密码管理器\n• 如果你怀疑被黑客入侵，立即重置\n\n如果你没有收到重置电子邮件，请检查你的垃圾邮件文件夹！📧',
      yue: '忘記咗你嘅密碼？冇問題！以下係重置方式：\n\n🔐 分步：\n1. 轉到登錄頁面\n2. 點擊"忘記密碼？"\n3. 輸入你嘅電子郵件或電話號碼\n4. 我哋會向你發送重置代碼（檢查你嘅電子郵件/短信）\n5. 喺下一頁上輸入代碼\n6. 創建新嘅強密碼\n7. 確認，你就完成咗！\n\n✨ 密碼提示：\n✓ 至少使用8個字符\n✓ 混合大寫、小寫、數字、符號\n✓ 避免個人信息（名字、出生日期等）\n✓ 唔好使用與其他應用相同嘅密碼\n✓ 定期更改（每3個月）\n\n🛡️ 安全提醒：\n• 永遠唔好與任何人分享你嘅密碼\n• 唔好以純文本形式保存\n• 如果可能，使用密碼管理器\n• 如果你懷疑被黑客入侵，立即重置\n\n如果你冇收到重置電子郵件，請檢查你嘅垃圾郵件文件夾！📧',
    },
    tags: ['account', 'password', 'security'],
    relatedErrandStatus: ['any'],
  },

  // ... Continue with more categories (Safety & Trust, Disputes, Points, Cancel/Refund, Ratings, Referral, Technical, Company)
  // I'll add these in batches

  // ===== SAFETY & TRUST (5+) =====
  {
    id: 'safety-guidelines',
    category: 'safety-trust',
    question: {
      en: 'How can I stay safe on Errandify?',
      zh: '我如何在帮帮乐上保持安全？',
      yue: '我點樣喺幫幫樂上保持安全？',
    },
    answer: {
      en: '🛡️ Your safety is our top priority! Here are essential tips:\n\n✅ Before accepting/bidding:\n• Check the other person\'s profile and ratings\n• Read their reviews - what do others say?\n• Trust your gut - if something feels off, skip it\n• Look for the ✓ verification badge\n\n✅ During the errand:\n• Meet in public places when possible\n• Tell a friend where you\'re going\n• Keep conversations on the app (not personal numbers)\n• Stay aware of your surroundings\n• Take photos of work completed (protects both of you!)\n\n✅ Payment safety:\n• Never pay outside the app\n• Never share payment details directly\n• Always use Errandify\'s payment system\n• Never give access to your account\n\n✅ If something feels wrong:\n• Use the "Report" button on their profile\n• Contact our support team immediately\n• Don\'t continue if you\'re uncomfortable\n• We take safety seriously and will investigate\n\n🆘 Emergency?\nUse our SOS button (red button at top of app) for immediate help.\n\nRemember: Trust is earned. Take your time to find the right fit! 💪',
      zh: '🛡️ 你的安全是我们的首要任务！以下是基本提示：\n\n✅ 接受/出价前：\n• 检查对方的档案和评级\n• 阅读他们的评论 - 其他人怎么说？\n• 相信你的直觉 - 如果感觉不对，就跳过\n• 寻找✓验证徽章\n\n✅ 在任务期间：\n• 尽可能在公共场所见面\n• 告诉朋友你要去的地方\n• 在应用上保持对话（不要个人电话号码）\n• 保持警惕\n• 拍摄完成工作的照片（保护双方！）\n\n✅ 付款安全：\n• 不要在应用外支付\n• 不要直接共享支付详情\n• 始终使用帮帮乐的支付系统\n• 不要提供对你账户的访问权限\n\n✅ 如果感觉不对：\n• 使用他们档案上的"举报"按钮\n• 立即联系我们的支持团队\n• 如果你不舒服，不要继续\n• 我们非常重视安全并会调查\n\n🆘 紧急情况？\n使用我们的SOS按钮（应用顶部的红色按钮）获得即时帮助。\n\n记住：信任是赚取的。花时间找到合适的！💪',
      yue: '🛡️ 你嘅安全係我哋嘅首要任務！以下係基本提示：\n\n✅ 接受/出價前：\n• 檢查對方嘅檔案同評級\n• 閱讀佢哋嘅評論 - 其他人點講？\n• 相信你嘅直覺 - 如果感覺唔啱，就跳過\n• 尋找✓驗證徽章\n\n✅ 喺任務期間：\n• 盡可能喺公共場所見面\n• 告訴朋友你要去嘅地方\n• 喺應用上保持對話（唔好個人電話號碼）\n• 保持警惕\n• 拍攝完成工作嘅相片（保護雙方！）\n\n✅ 付款安全：\n• 唔好喺應用外支付\n• 唔好直接共享支付詳情\n• 始終使用幫幫樂嘅支付系統\n• 唔好提供對你賬戶嘅訪問權限\n\n✅ 如果感覺唔啱：\n• 使用佢哋檔案上嘅"舉報"按鈕\n• 立即聯繫我哋嘅支持團隊\n• 如果你唔舒服，唔好繼續\n• 我哋非常重視安全並會調查\n\n🆘 緊急情況？\n使用我哋嘅SOS按鈕（應用頂部嘅紅色按鈕）獲得即時幫助。\n\n記住：信任係賺取嘅。花時間搵到合適嘅！💪',
    },
    tags: ['safety', 'trust', 'important'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'identity-verification',
    category: 'safety-trust',
    question: {
      en: 'How does Errandify verify user identity?',
      zh: '帮帮乐如何验证用户身份？',
      yue: '幫幫樂點樣驗證用戶身份？',
    },
    answer: {
      en: 'We have multiple layers of identity verification to keep everyone safe!\n\n🔍 Our verification process:\n\n1. Phone Verification:\n• Confirm your phone number\n• Receive and enter SMS code\n• Helps prevent fake accounts\n\n2. Email Verification:\n• Confirm your email address\n• Receive verification link\n• Ensures contact information is real\n\n3. ID Verification:\n• Upload photo of government ID\n• Photo matches face verification\n• Detects fraudulent documents\n• Information stored securely\n\n4. Payment Method Verification:\n• Verify credit/debit card\n• Name matches profile\n• Prevents stolen cards\n\n5. Address Verification:\n• Confirm residential address\n• May send physical postcard\n• Ensures location authenticity\n\n✅ Trust badges:\n• Green checkmark = Fully verified\n• Shows on profile publicly\n• Increases trust with other users\n\n🔒 Your data is safe:\n• All information encrypted\n• Stored securely\n• Never sold to third parties\n• You can delete anytime\n\nVerification makes Errandify safer for everyone! 🛡️',
      zh: '我们有多层身份验证来保护每个人的安全！\n\n🔍 我们的验证过程：\n\n1. 电话验证：\n• 确认你的电话号码\n• 接收并输入短信代码\n• 有助于防止虚假账户\n\n2. 电子邮件验证：\n• 确认你的电子邮件地址\n• 接收验证链接\n• 确保联系信息是真实的\n\n3. ID验证：\n• 上传政府身份证照片\n• 照片与脸部验证相匹配\n• 检测欺诈性文件\n• 信息存储安全\n\n4. 支付方法验证：\n• 验证信用卡/借记卡\n• 名称与档案相符\n• 防止卡被盗\n\n5. 地址验证：\n• 确认住宅地址\n• 可能发送实体明信片\n• 确保位置真实性\n\n✅ 信任徽章：\n• 绿色复选标记 = 完全验证\n• 在档案上公开显示\n• 增加与其他用户的信任\n\n🔒 你的数据是安全的：\n• 所有信息加密\n• 安全存储\n• 从不出售给第三方\n• 你可以随时删除\n\n验证使帮帮乐对所有人都更安全！🛡️',
      yue: '我哋有多層身份驗證嚟保護每個人嘅安全！\n\n🔍 我哋嘅驗證過程：\n\n1. 電話驗證：\n• 確認你嘅電話號碼\n• 接收同輸入短信代碼\n• 有助於防止虛假賬戶\n\n2. 電子郵件驗證：\n• 確認你嘅電子郵件地址\n• 接收驗證鏈接\n• 確保聯繫信息係真實嘅\n\n3. ID驗證：\n• 上載政府身份證相片\n• 相片與臉部驗證相匹配\n• 檢測欺詐性文件\n• 信息存儲安全\n\n4. 支付方法驗證：\n• 驗證信用卡/借記卡\n• 名稱與檔案相符\n• 防止卡被盜\n\n5. 地址驗證：\n• 確認住宅地址\n• 可能發送實體明信片\n• 確保位置真實性\n\n✅ 信任徽章：\n• 綠色複選標記 = 完全驗證\n• 喺檔案上公開顯示\n• 增加與其他用戶嘅信任\n\n🔒 你嘅數據係安全嘅：\n• 所有信息加密\n• 安全存儲\n• 從唔出售畀第三方\n• 你可以隨時刪除\n\n驗證使幫幫樂對所有人都更安全！🛡️',
    },
    tags: ['verification', 'safety', 'identity'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'report-user',
    category: 'safety-trust',
    question: {
      en: 'How do I report a user who is behaving inappropriately?',
      zh: '我如何举报行为不当的用户？',
      yue: '我點樣舉報行為不當嘅用戶？',
    },
    answer: {
      en: 'If someone is behaving inappropriately, we want to know! Here\'s how to report them:\n\n🚨 Quick report:\n1. Go to their profile\n2. Tap the three dots (•••)\n3. Select "Report User"\n4. Choose reason for report\n5. Add details (screenshots help!)\n6. Submit\n\n📋 Report reasons:\n• Harassment or threatening behavior\n• Discriminatory language\n• Inappropriate photos or messages\n• Fraudulent activity\n• No-show doer\n• Poor work quality\n• Payment disputes\n• Other\n\n✅ What happens after reporting:\n• Our team reviews within 24-48 hours\n• We may ask you for more information\n• User receives warning or suspension\n• Repeat offenders may be banned\n• You\'re notified of action taken\n\n🔒 Your report is confidential:\n• Your identity is protected\n• User doesn\'t know who reported them\n• All reports are investigated fairly\n\n💡 Pro tip:\nSave screenshots of inappropriate messages. They help us investigate faster!\n\nTogether we keep Errandify safe! 🛡️',
      zh: '如果有人表现不当，我们想知道！以下是举报他们的方法：\n\n🚨 快速举报：\n1. 转到他们的档案\n2. 点击三个点（•••）\n3. 选择"举报用户"\n4. 选择举报原因\n5. 添加详情（截图会有帮助！）\n6. 提交\n\n📋 举报原因：\n• 骚扰或威胁行为\n• 歧视性语言\n• 不当照片或消息\n• 欺诈活动\n• 帮手不出现\n• 工作质量差\n• 付款纠纷\n• 其他\n\n✅ 举报后会发生什么：\n• 我们的团队在24-48小时内审查\n• 我们可能会要求你提供更多信息\n• 用户收到警告或暂停\n• 累犯可能被禁用\n• 你会收到所采取行动的通知\n\n🔒 你的举报是保密的：\n• 你的身份受到保护\n• 用户不知道谁举报了他们\n• 所有举报都会被公平调查\n\n💡 专业提示：\n保存不当消息的截图。它们可以帮助我们更快地进行调查！\n\n一起保持帮帮乐安全！🛡️',
      yue: '如果有人表現不當，我哋想知道！以下係舉報佢哋嘅方法：\n\n🚨 快速舉報：\n1. 轉到佢哋嘅檔案\n2. 點擊三個點（•••）\n3. 選擇"舉報用戶"\n4. 選擇舉報原因\n5. 添加詳情（截圖會有幫助！）\n6. 提交\n\n📋 舉報原因：\n• 騷擾或威脅行為\n• 歧視性語言\n• 不當相片或消息\n• 欺詐活動\n• 幫手唔出現\n• 工作質量差\n• 付款爭議\n• 其他\n\n✅ 舉報後會發生咩：\n• 我哋嘅團隊喺24-48小時內審查\n• 我哋可能會要求你提供更多信息\n• 用戶收到警告或暫停\n• 累犯可能被禁用\n• 你會收到所採取行動嘅通知\n\n🔒 你嘅舉報係保密嘅：\n• 你嘅身份受到保護\n• 用戶唔知道誰舉報咗佢哋\n• 所有舉報都會被公平調查\n\n💡 專業提示：\n保存不當消息嘅截圖。佢哋可以幫助我哋更快地進行調查！\n\n一起保持幫幫樂安全！🛡️',
    },
    tags: ['safety', 'reporting', 'community'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'block-user',
    category: 'safety-trust',
    question: {
      en: 'Can I block a user?',
      zh: '我可以屏蔽一个用户吗？',
      yue: '我可以屏蔽一個用戶嗎？',
    },
    answer: {
      en: 'Yes! You can block users to protect your privacy and safety.\n\n🚫 How to block someone:\n1. Go to their profile\n2. Tap the three dots (•••)\n3. Select "Block User"\n4. Confirm the action\n\n✅ What blocking does:\n• They can\'t message you\n• They can\'t see your profile\n• They can\'t bid on your errands\n• They won\'t see your posts\n• You won\'t see their profile or posts\n\n⚙️ Manage blocked users:\n1. Go to Settings\n2. Select "Privacy & Blocking"\n3. Tap "Blocked Users"\n4. View or unblock anyone\n\n🔒 Privacy note:\n• Blocking is private - they don\'t know they\'re blocked\n• You can unblock anytime\n• Blocking won\'t affect past transactions\n\n💡 When to block:\n• Harassment or rude messages\n• Uncomfortable behavior\n• Safety concerns\n• Spamming\n• Unwanted contact\n\nYour comfort and safety come first! 💪',
      zh: '是的！你可以屏蔽用户来保护你的隐私和安全。\n\n🚫 如何屏蔽某人：\n1. 转到他们的档案\n2. 点击三个点（•••）\n3. 选择"屏蔽用户"\n4. 确认操作\n\n✅ 屏蔽的作用：\n• 他们无法给你发消息\n• 他们看不到你的档案\n• 他们无法对你的任务进行出价\n• 他们看不到你的帖子\n• 你看不到他们的档案或帖子\n\n⚙️ 管理被屏蔽的用户：\n1. 转到设置\n2. 选择"隐私和屏蔽"\n3. 点击"被屏蔽的用户"\n4. 查看或解除屏蔽任何人\n\n🔒 隐私说明：\n• 屏蔽是私密的 - 他们不知道自己被屏蔽了\n• 你可以随时解除屏蔽\n• 屏蔽不会影响过去的交易\n\n💡 何时屏蔽：\n• 骚扰或粗鲁消息\n• 令人不适的行为\n• 安全问题\n• 垃圾邮件\n• 不需要的联系\n\n你的舒适和安全最重要！💪',
      yue: '係呀！你可以屏蔽用戶嚟保護你嘅隱私同安全。\n\n🚫 點樣屏蔽某人：\n1. 轉到佢哋嘅檔案\n2. 點擊三個點（•••）\n3. 選擇"屏蔽用戶"\n4. 確認操作\n\n✅ 屏蔽嘅作用：\n• 佢哋無法畀你發消息\n• 佢哋睇唔到你嘅檔案\n• 佢哋無法對你嘅任務進行出價\n• 佢哋睇唔到你嘅貼文\n• 你睇唔到佢哋嘅檔案或貼文\n\n⚙️ 管理被屏蔽嘅用戶：\n1. 轉到設置\n2. 選擇"隱私同屏蔽"\n3. 點擊"被屏蔽嘅用戶"\n4. 查睇或解除屏蔽任何人\n\n🔒 隱私說明：\n• 屏蔽係私密嘅 - 佢哋唔知道自己被屏蔽咗\n• 你可以隨時解除屏蔽\n• 屏蔽唔會影響過去嘅交易\n\n💡 何時屏蔽：\n• 騷擾或粗魯消息\n• 令人不適嘅行為\n• 安全問題\n• 垃圾郵件\n• 唔需要嘅聯繫\n\n你嘅舒適同安全最重要！💪',
    },
    tags: ['safety', 'blocking', 'privacy'],
    relatedErrandStatus: ['any'],
  },
];

export default COMPREHENSIVE_FAQ;
