// Comprehensive FAQ Database for Hana
// Dynamic, bilingual (English/中文), organized by topics

export type Language = 'en' | 'zh';

export interface FAQItem {
  id: string;
  category: string;
  question: Record<Language, string>;
  answer: Record<Language, string>;
  tags: string[];
  relatedErrandStatus?: string[];
}

export const FAQ_TOPICS = {
  'posting-errand': '📝 Posting an Errand',
  'bidding-accepting': '🤝 Offering & Accepting',
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
  // POSTING AN ERRAND (6)
  {
    id: 'post-errand-basic',
    category: 'posting-errand',
    question: { en: 'How do I post an errand?', zh: '我如何发布任务？' },
    answer: { en: 'Great question! Posting an errand is super simple:\n\n1. Tap the "+" button at the bottom\n2. Choose "Post an Errand"\n3. Describe what you need\n4. Set a title and detailed description\n5. Set your budget and deadline\n6. Choose category and submit!\n\nOnce posted, doers will start sending you offers. Pretty simple, right? 😊', zh: '好问题！发布任务非常简单：\n\n1. 点击屏幕底部的"+"按钮\n2. 选择"发布帮帮"\n3. 描述你需要的帮助\n4. 设定清晰的标题和详细描述\n5. 设定预算和截止日期\n6. 选择类别并提交！\n\n一旦发布，帮手会开始向你发送出价。很简单吧？😊' },
    tags: ['beginner', 'posting', 'step-by-step'],
    relatedErrandStatus: ['draft', 'posted'],
  },
  {
    id: 'post-detailed-description',
    category: 'posting-errand',
    question: { en: 'What should I include in my errand description?', zh: '我应该在任务描述中包括什么？' },
    answer: { en: 'The more details you provide, the better offers you\'ll get!\n\n✓ Be specific: Say exactly what needs to be done\n✓ Set expectations: Include photos if helpful\n✓ Mention requirements: Allergies, tools, etc.\n✓ Be honest about difficulty: Simple or complex?\n✓ Specify deadline: "Today by 6pm" vs "sometime this week"\n\nClear descriptions = Better offers = Happier outcomes! 🎯', zh: '你提供的细节越多，你得到的出价就越好！\n\n✓ 具体一点：不是"清洁"，而是"3室公寓深层清洁"\n✓ 设定清晰的期望：具体需要做什么？\n✓ 提及特殊要求：过敏症、工具等\n✓ 诚实说明难度：简单还是复杂？\n✓ 指定截止日期："今天下午6点前"\n\n清晰的描述=更好的出价=更幸福的结果！🎯' },
    tags: ['posting', 'tips', 'best-practices'],
    relatedErrandStatus: ['draft'],
  },
  {
    id: 'post-price-budget',
    category: 'posting-errand',
    question: { en: 'How do I set a fair budget for my errand?', zh: '我如何为任务设定合理的预算？' },
    answer: { en: 'Setting the right budget helps you get quality offers!\n\n📊 Research first: Look at similar errands posted\n💭 Consider complexity: Simple = lower, complex = higher\n⏰ Think about time: Longer jobs cost more\n🌍 Factor location: Urban areas might be pricier\n🤝 Respect doers: These are real people doing real work\n\nA slightly higher budget often means better quality and faster service! 💪', zh: '设定正确的预算有助于获得优质出价！\n\n📊 先研究：查看类似的已发布任务\n💭 考虑复杂性：简单=较低预算，复杂=较高预算\n⏰ 考虑时间：较长的工作费用更高\n🌍 考虑位置：城市地区可能比郊区更昂贵\n🤝 尊重帮手：记住，这些是做真实工作的真实的人\n\n稍高的预算通常意味着更好的工作质量和更快的服务！💪' },
    tags: ['posting', 'budget', 'pricing'],
    relatedErrandStatus: ['draft'],
  },
  {
    id: 'post-edit-errand',
    category: 'posting-errand',
    question: { en: 'Can I edit my errand after posting?', zh: '发布后我可以编辑我的任务吗？' },
    answer: { en: 'Yes! You can edit your errand before someone accepts your offer.\n\n1. Go to your errand details\n2. Tap "Edit"\n3. Make your changes\n4. Save changes\n\nOnce a doer accepts, you can\'t edit major details, but you can still chat. If you need to cancel, follow the cancellation process.\n\nTip: Edit early for better offers! ✏️', zh: '是的！在有人接受你的出价之前，你可以随时编辑你的任务。\n\n1. 转到你的任务详情\n2. 点击"编辑"\n3. 对描述、预算或截止日期进行更改\n4. 保存更改\n\n一旦帮手接受你的出价，你就不能编辑主要细节，但你仍然可以通过应用聊天与他们交流。如果你需要取消，请遵循取消流程。\n\n提示：如果需要，请提前编辑！✏️' },
    tags: ['posting', 'editing', 'tips'],
    relatedErrandStatus: ['posted', 'bidding'],
  },
  {
    id: 'post-best-time',
    category: 'posting-errand',
    question: { en: 'What is the best time to post an errand?', zh: '发布任务的最佳时间是什么？' },
    answer: { en: 'Timing matters! Best times for offers:\n\n🌞 Weekday mornings (8-10am): Doers starting day\n☀️ Lunch time (11am-1pm): Many checking errands\n🌅 Early evening (4-6pm): Peak offering time\n📅 Weekdays get more offers than weekends\n\nBut if your errand is urgent, post immediately! A good urgent errand attracts doers anytime. 🚀', zh: '时间很重要！以下是你会得到最好结果的时候：\n\n🌞 工作日早上（8-10点）：帮手开始他们的一天\n☀️ 午餐时间（11点-1点）：许多人在检查可用任务\n🌅 傍晚（下午4-6点）：出价的峰值时间\n📅 工作日获得更多出价，特别是对于服务\n\n但是，如果你的任务很紧急，立即发布！一个好的紧急任务即使在非高峰时间也会吸引帮手。🚀' },
    tags: ['posting', 'timing', 'strategy'],
    relatedErrandStatus: ['posted'],
  },
  {
    id: 'post-private-errand',
    category: 'posting-errand',
    question: { en: 'Can I make my errand private?', zh: '我可以将我的任务设为私密吗？' },
    answer: { en: 'Yes! Post private errands only visible to selected doers.\n\n🔒 Private errand benefits:\n• Only people you invite can see it\n• More control over who offers\n• Better for sensitive errands\n• Direct contact with specific doers\n\nHow: Toggle "Private Errand" when posting, then enter doer names to invite.\n\nPerfect for building strong working relationships! 🤝', zh: '是的！你可以发布只对所选帮手可见的私密任务。\n\n🔒 私密任务的优点：\n• 只有你邀请的人可以看到它\n• 更好地控制谁出价\n• 适合敏感任务\n• 与特定帮手的直接联系\n\n方法：发布时切换"私密任务"，然后输入要邀请的帮手名称。\n\n非常适合建立牢固的工作关系！🤝' },
    tags: ['posting', 'privacy', 'advanced'],
    relatedErrandStatus: ['draft'],
  },

  // BIDDING & ACCEPTING (6)
  {
    id: 'bidding-how-works',
    category: 'bidding-accepting',
    question: { en: 'How does offering work on Errandify?', zh: '在帮帮乐上出价是如何运作的？' },
    answer: { en: 'Offering is how doers show interest in your errand!\n\n1. You post an errand with details and budget\n2. Doers see your errand and place a offer\n3. You review all offers, profiles, and ratings\n4. You choose your preferred doer by accepting their offer\n5. Work begins - you coordinate and complete the errand\n6. Payment happens once work is approved\n\nYou\'re in control! You only pay when happy with the work. 💼', zh: '出价是帮手表示对你的帮帮感兴趣的方式！流程如下：\n\n1. 你发布一个有详细信息和预算的帮帮\n2. 帮手看到你的帮帮并可以出价\n3. 你审查所有出价、帮手档案和评级\n4. 你选择你首选的帮手来接受他们的出价\n5. 工作开始 - 你和你的帮手协调并完成任务\n6. 支付发生 一旦工作被批准\n\n你掌握权力！你只有在满意工作时才会支付。💼' },
    tags: ['bidding', 'how-it-works', 'beginner'],
    relatedErrandStatus: ['posted', 'bidding'],
  },
  {
    id: 'accept-best-bid',
    category: 'bidding-accepting',
    question: { en: 'How do I choose the best offer?', zh: '我如何选择最好的出价？' },
    answer: { en: 'Choosing the right doer is important!\n\n⭐ Look at: Ratings & reviews from other users\n✓ Completed Jobs: How many have they successfully done?\n💬 Offer Message: Shows they read your posting\n💰 Price: Is it competitive and fair?\n👤 Profile: Do they seem trustworthy?\n🎯 Experience: Have they done similar work?\n\nPro tip: Don\'t always pick the cheapest! A slightly higher price often means better quality. 💪', zh: '选择合适的帮手很重要！\n\n⭐ 评级与评论：查看他们的星级评分和他人的评论\n✓ 已完成的工作：他们已成功完成多少项帮帮？\n💬 出价信息：一些帮手会添加备注\n💰 价格：它有竞争力吗？\n👤 档案：他们看起来值得信赖吗？\n🎯 相关经验：他们之前做过类似的工作吗？\n\n我们的提示：不要总是选择最便宜的！稍高的价格通常意味着更好的质量和可靠性。' },
    tags: ['bidding', 'tips', 'best-practices'],
    relatedErrandStatus: ['bidding'],
  },
  {
    id: 'accept-bid-process',
    category: 'bidding-accepting',
    question: { en: 'How do I accept a offer?', zh: '我如何接受出价？' },
    answer: { en: 'Accepting a offer is easy!\n\n1. Review the offers you\'ve received\n2. Click on the doer\'s profile\n3. Read their offer message and reviews\n4. When ready, tap "Accept Offer"\n5. The doer is notified and work coordination begins\n6. You\'ll have a chat room to communicate\n\nOnce accepted, payment is held securely. The doer will reach out to confirm details.\n\nRemember: You only release payment after you approve the completed work! 💰', zh: '接受出价很容易！\n\n1. 审查你收到的出价\n2. 点击帮手的档案\n3. 阅读他们的出价信息并检查他们的评论\n4. 当你准备好时，点击"接受出价"\n5. 帮手将收到通知，工作协调开始\n6. 你将有一个聊天室来沟通细节\n\n一旦接受，付款将被安全地保管。帮手随后将与你联系以确认细节。\n\n记住：你只有在批准完成的工作后才会释放付款！💰' },
    tags: ['bidding', 'accepting', 'step-by-step'],
    relatedErrandStatus: ['bidding'],
  },
  {
    id: 'multiple-bids-strategy',
    category: 'bidding-accepting',
    question: { en: 'What if I receive multiple offers? Which should I choose?', zh: '如果我收到多个出价怎么办？我应该选择哪一个？' },
    answer: { en: 'Great problem to have! Multiple offers mean interest.\n\n📊 Compare by:\n• 50% reputation (ratings + reviews + completed jobs)\n• 30% price (fair and competitive)\n• 20% communication (do they understand your needs?)\n\n💡 Tips:\n• Don\'t just pick the cheapest\n• Read recent reviews for current performance\n• Check if they\'ve done similar work\n• A slightly higher price often means better results\n\nTrust your instinct! The right doer is usually obvious after comparing. ⭐', zh: '获得多个出价很好！这意味着帮手对你的工作感兴趣。\n\n📊 根据以下内容做出决定：\n• 50% 声誉（评级 + 评论 + 已完成的工作）\n• 30% 价格（公平且有竞争力）\n• 20% 沟通（他们理解你的需求吗？）\n\n💡 专业提示：\n• 不要仅仅选择最便宜的\n• 阅读最近的评论以了解当前表现\n• 检查他们是否做过类似的工作\n• 稍高的价格通常意味着更好的结果\n\n相信你的直觉！比较几个档案后，合适的帮手通常很明显。⭐' },
    tags: ['bidding', 'choosing', 'strategy'],
    relatedErrandStatus: ['bidding'],
  },
  {
    id: 'bid-negotiation',
    category: 'bidding-accepting',
    question: { en: 'Can I negotiate the offer price with a doer?', zh: '我可以与帮手协商出价吗？' },
    answer: { en: 'Yes! You can negotiate through the app messaging.\n\n💬 How to negotiate:\n1. Review the offer message\n2. Send a message asking if they\'re flexible\n3. Make a counter-offer in your budget\n4. Be respectful and professional\n\n✅ Tips:\n• Always be polite and fair\n• Explain your budget constraints\n• Ask what\'s included in their offer\n• Offer value (longer timeline, future work)\n\nDoers are professionals deserving fair compensation. Most will negotiate if you\'re reasonable! 🤝', zh: '是的！你可以通过应用消息系统与帮手协商。\n\n💬 如何协商：\n1. 审查出价信息\n2. 发送消息询问他们是否灵活\n3. 在你的预算范围内提出反邀约\n4. 保持尊重和专业\n\n✅ 协商提示：\n• 始终礼貌和公平\n• 解释你的预算限制\n• 问他们的出价包括什么\n• 提供附加价值\n\n帮手是值得公平报酬的专业人士。大多数人如果你合理，都愿意协商！🤝' },
    tags: ['bidding', 'negotiation', 'tips'],
    relatedErrandStatus: ['bidding'],
  },
  {
    id: 'reject-bid',
    category: 'bidding-accepting',
    question: { en: 'How do I reject a offer?', zh: '我如何拒绝出价？' },
    answer: { en: 'You can politely reject offers that don\'t meet your needs.\n\n💬 How to reject:\n1. View offer details\n2. Tap "Reject" or "Decline"\n3. Optionally add a message\n4. Confirm rejection\n\n✅ Best practices:\n• Be respectful - doers put effort in\n• Provide honest feedback if possible\n• Example: "Thank you for your offer! We\'ve decided to go with another doer."\n\n💡 Tips:\n• You don\'t have to explain\n• Don\'t ghost - send a quick message\n• Rejecting doesn\'t prevent future offers\n\nRejection is part of the process. Most doers understand! 👋', zh: '你可以礼貌地拒绝不符合你需求的出价。\n\n💬 如何拒绝：\n1. 查看出价详情\n2. 点击"拒绝"或"取消"\n3. 可选：添加消息\n4. 确认拒绝\n\n✅ 拒绝时的最佳实践：\n• 要尊重 - 帮手投入了精力\n• 如果可能，提供诚实的反馈\n• 例子："感谢你的出价！我们决定与另一个帮手合作。"\n\n💡 提示：\n• 你不必解释\n• 不要无视 - 快速消息是一种礼貌\n• 拒绝不会阻止他们未来的出价\n\n拒绝是这个过程的一部分。大多数帮手理解！👋' },
    tags: ['bidding', 'rejection', 'communication'],
    relatedErrandStatus: ['bidding'],
  },

  // PAYMENT & WALLET (3)
  {
    id: 'payment-how-safe',
    category: 'payment-wallet',
    question: { en: 'Is my payment safe? When do I pay?', zh: '我的付款安全吗？我什么时候付款？' },
    answer: { en: 'Your payment is completely safe!\n\n🛡️ Protected Process: Your money stays with us until work is done and approved\n\n💰 Payment flow:\n1. You accept a offer\n2. We hold payment securely in escrow\n3. Doer completes the work\n4. You approve the work\n5. Payment is released to doer\n\n✅ You\'re protected: No payment leaves without your approval.\n🔒 Security: 256-bit encryption, industry standards.\n\nKey: You never pay upfront. Only after you\'re satisfied! 💪', zh: '你的付款完全安全！\n\n🛡️ 受保护的流程：你的钱在我们这里保管，直到工作完成并得到批准\n\n💰 付款流程：\n1. 你接受一个出价\n2. 我们安全地在第三方托管中保管付款\n3. 帮手完成工作\n4. 你批准工作\n5. 付款被释放给帮手\n\n✅ 你受保护：没有你的批准，任何付款都不会离开你的账户。\n🔒 安全性：256位SSL加密，行业标准。\n\n关键点：你永远不需要预先付款。只在满意工作后！💪' },
    tags: ['payment', 'security', 'trust'],
    relatedErrandStatus: ['accepted', 'in-progress', 'completed'],
  },
  {
    id: 'wallet-balance',
    category: 'payment-wallet',
    question: { en: 'How do I check my wallet balance?', zh: '我如何检查我的钱包余额？' },
    answer: { en: 'Managing your wallet is easy!\n\n📱 Check balance:\n1. Go to your profile\n2. Tap "Wallet"\n3. See balance & transaction history\n\n💳 Add money:\n1. Tap "Add Money" or "Top Up"\n2. Choose amount\n3. Select payment method\n4. Confirm\n\n📊 Transaction history: View all past payments anytime.\n\nAll transactions are secure and encrypted! 🔒', zh: '管理你的钱包很容易！\n\n📱 检查余额：\n1. 转到你的档案\n2. 点击"钱包"\n3. 查看余额和交易历史\n\n💳 添加金钱：\n1. 点击"添加金钱"或"充值"\n2. 选择金额\n3. 选择支付方法\n4. 确认\n\n📊 交易历史：随时查看所有过去的付款。\n\n所有交易都是安全和加密的！🔒' },
    tags: ['wallet', 'payment', 'top-up'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'refund-process',
    category: 'payment-wallet',
    question: { en: 'How long does it take to get a refund?', zh: '获得退款需要多长时间？' },
    answer: { en: 'Refunds are processed quickly!\n\n⚡ Instant: Disputes resolved in your favor, cancellation within 2 hours\n📅 24-48 Hours: Cancellation after 2 hours, payment disputes\n🏦 Bank Processing: 2-5 business days to your account\n\n💡 Pro tips:\n• Instant refunds go to your wallet\n• Use wallet funds immediately\n• Bank transfers may take longer\n\nCan\'t find yours? Contact support@errandify.com! 📧', zh: '退款处理很快！\n\n⚡ 即时退款：纠纷对你有利，接受后2小时内取消\n📅 24-48小时退款：接受后2小时后取消，付款纠纷\n🏦 银行处理：2-5个工作日到您的账户\n\n💡 专业提示：\n• 即时退款进入您的钱包\n• 立即使用钱包资金\n• 银行转账可能需要更长时间\n\n找不到退款？请联系support@errandify.com！📧' },
    tags: ['payment', 'refund', 'timeline'],
    relatedErrandStatus: ['any'],
  },

  // ACCOUNT & PROFILE (2)
  {
    id: 'profile-setup',
    category: 'account-profile',
    question: { en: 'How do I set up my profile?', zh: '我如何设置我的档案？' },
    answer: { en: 'Your profile is your identity on Errandify!\n\n📸 Add photo: Settings > Add Photo\n📝 Complete bio: Write brief intro (50-200 words)\n✅ Verify: Email + phone, optional government ID\n\n💡 Pro tips:\n• Good photo = more trust\n• Complete profile = more jobs\n• Update regularly\n\nA complete profile attracts more opportunities! 🚀', zh: '你的档案是你在帮帮乐上的身份！\n\n📸 添加照片：设置 > 添加照片\n📝 完成简介：写简短介绍（50-200字）\n✅ 验证：电子邮件+电话，可选政府身份证\n\n💡 专业提示：\n• 好照片=更多信任\n• 完整档案=更多工作\n• 定期更新\n\n完整的档案会吸引更多机会！🚀' },
    tags: ['profile', 'setup', 'beginner'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'privacy-settings',
    category: 'account-profile',
    question: { en: 'How do I control my privacy?', zh: '我如何控制我的隐私？' },
    answer: { en: 'Your privacy is important!\n\n👁️ Visibility:\n• Public: Everyone can see\n• Friends: Connections only\n• Private: Only matches\n\n📧 Communication:\n• Email frequency control\n• SMS toggle\n• Do-not-disturb hours\n\n🔒 Blocking:\n• Block specific users\n• Report inappropriate behavior\n• Hide from search\n\nYou control your information! 🛡️', zh: '你的隐私很重要！\n\n👁️ 可见性：\n• 公开：所有人都可以看到\n• 朋友：仅限连接\n• 私密：仅限匹配\n\n📧 沟通：\n• 电子邮件频率控制\n• 短信切换\n• 勿扰时间\n\n🔒 屏蔽：\n• 屏蔽特定用户\n• 举报不当行为\n• 从搜索中隐藏\n\n你控制你的信息！🛡️' },
    tags: ['privacy', 'settings', 'security'],
    relatedErrandStatus: ['any'],
  },

  // SAFETY & TRUST (2)
  {
    id: 'safety-guidelines',
    category: 'safety-trust',
    question: { en: 'How can I stay safe on Errandify?', zh: '我如何在帮帮乐上保持安全？' },
    answer: { en: 'Your safety is our top priority!\n\n✅ Before accepting:\n• Check profiles and ratings\n• Read reviews from others\n• Trust your gut\n\n✅ During errand:\n• Meet in public places\n• Tell a friend where you\'re going\n• Keep conversations on app\n• Take photos of completed work\n\n✅ Payment safety:\n• Never pay outside app\n• Never share payment details directly\n• Use Errandify payment system\n\n🆘 Emergency? Use our SOS button! 🛡️', zh: '你的安全是我们的首要任务！\n\n✅ 接受前：\n• 检查档案和评级\n• 阅读他人的评论\n• 相信你的直觉\n\n✅ 在任务期间：\n• 尽可能在公共场所见面\n• 告诉朋友你要去的地方\n• 在应用上保持对话\n• 拍摄完成工作的照片\n\n✅ 付款安全：\n• 不要在应用外支付\n• 不要直接共享支付详情\n• 使用帮帮乐支付系统\n\n🆘 紧急情况？使用我们的SOS按钮！🛡️' },
    tags: ['safety', 'trust', 'important'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'report-user',
    category: 'safety-trust',
    question: { en: 'How do I report a user?', zh: '我如何举报用户？' },
    answer: { en: 'If someone is behaving inappropriately:\n\n🚨 Quick report:\n1. Go to their profile\n2. Tap three dots (•••)\n3. Select "Report User"\n4. Choose reason\n5. Add details & submit\n\n📋 Report reasons:\n• Harassment or threats\n• Discriminatory language\n• Inappropriate photos/messages\n• Fraudulent activity\n• No-show doer\n• Poor work quality\n\n✅ After reporting:\n• Our team reviews in 24-48 hours\n• User may be warned or suspended\n• You\'re notified of action\n\nReports are confidential! We take safety seriously. 🛡️', zh: '如果有人表现不当：\n\n🚨 快速举报：\n1. 转到他们的档案\n2. 点击三个点（•••）\n3. 选择"举报用户"\n4. 选择原因\n5. 添加详情并提交\n\n📋 举报原因：\n• 骚扰或威胁\n• 歧视性语言\n• 不当照片或消息\n• 欺诈活动\n• 帮手不出现\n• 工作质量差\n\n✅ 举报后：\n• 我们的团队在24-48小时内审查\n• 用户可能受到警告或暂停\n• 你会收到行动通知\n\n举报是保密的！我们认真对待安全。🛡️' },
    tags: ['safety', 'reporting', 'community'],
    relatedErrandStatus: ['any'],
  },

  // DISPUTES & ISSUES (2)
  {
    id: 'dispute-open',
    category: 'disputes-issues',
    question: { en: 'How do I open a dispute?', zh: '如果出问题，我如何开启纠纷？' },
    answer: { en: 'If work quality doesn\'t meet expectations:\n\n📝 How to open:\n1. Go to completed errand\n2. Tap "Report Issue" or "Open Dispute"\n3. Select dispute reason\n4. Provide detailed description\n5. Add photos/evidence\n6. Submit\n\n⏱️ Timeline:\n• Open within 7 days of completion\n• Review completed in 48-72 hours\n• Resolution in 5-7 business days\n\n📋 Common reasons:\n• Work not completed properly\n• Quality below expectations\n• Different from what was agreed\n• Damaged property\n\nWe investigate all disputes fairly! ⚖️', zh: '如果工作质量不符合预期：\n\n📝 如何开启：\n1. 转到已完成的任务\n2. 点击"举报问题"或"开启纠纷"\n3. 选择纠纷原因\n4. 提供详细描述\n5. 添加照片/证据\n6. 提交\n\n⏱️ 时间表：\n• 在任务完成后7天内开启\n• 在48-72小时内审查\n• 在5-7个工作日内解决\n\n📋 常见原因：\n• 工作未正确完成\n• 质量低于预期\n• 与同意的内容不同\n• 损坏的财产\n\n我们公平调查所有纠纷！⚖️' },
    tags: ['disputes', 'resolution', 'help'],
    relatedErrandStatus: ['completed', 'disputed'],
  },
  {
    id: 'dispute-evidence',
    category: 'disputes-issues',
    question: { en: 'What evidence should I provide?', zh: '我应该为纠纷提供什么证据？' },
    answer: { en: 'Strong evidence helps us resolve disputes fairly!\n\n📸 Best types:\n✓ Photos/Videos: Before & after, condition, timestamps\n✓ Messages: Chat history with doer, original agreement\n✓ Documentation: Invoice, receipt, screenshots\n✓ Witness: Contact info of anyone present\n\n💡 Pro tips:\n• Timestamp your photos\n• Screenshot messages immediately\n• Document right after incident\n• Be specific (what, where, when)\n• Keep original files\n\n🎯 What NOT to include:\n• Opinions or assumptions\n• Emotional language\n• Personal attacks\n\nClear evidence = faster resolution! ✅', zh: '强有力的证据帮助我们公平地解决纠纷！\n\n📸 最佳类型：\n✓ 照片/视频：前后对比，状态，时间戳\n✓ 消息：与帮手的聊天记录，原始协议\n✓ 文件：发票，收据，截图\n✓ 证人：在场任何人的联系信息\n\n💡 专业提示：\n• 为照片添加时间戳\n• 立即屏幕截图消息\n• 事件发生后立即记录\n• 具体（什么、在哪里、何时）\n• 保留原始文件\n\n🎯 不要包括：\n• 意见或假设\n• 情绪化语言\n• 人身攻击\n\n清晰的证据=更快的解决！✅' },
    tags: ['disputes', 'evidence', 'documentation'],
    relatedErrandStatus: ['completed', 'disputed'],
  },

  // POINTS & REWARDS (2)
  {
    id: 'points-earn',
    category: 'points-rewards',
    question: { en: 'How do I earn Errandify Points?', zh: '我如何赚取帮帮乐积分？' },
    answer: { en: 'Earn Points with every action on Errandify!\n\n⭐ Ways to earn:\n• Submit as customer: 10 points/errand\n• Complete as doer: 25 points/errand\n• 5-star rating: +3 points\n• Detailed review: +5 points\n• Referral: +50 points\n• Join loyalty: +50 points\n\n💡 Ways to use:\n• Discount on future errands\n• Unlock premium features\n• Redeem for rewards\n• Gift to friends\n\nPoints never expire if you stay active! 🎯', zh: '通过帮帮乐上的每一项操作赚取积分！\n\n⭐ 赚取方式：\n• 作为客户提交：每个帮帮10分\n• 作为帮手完成：每个帮帮25分\n• 给予5星评级：+3分\n• 写详细评论：+5分\n• 推荐：+50分\n• 加入忠诚：+50分\n\n💡 使用方式：\n• 未来任务折扣\n• 解锁高级功能\n• 兑换奖励\n• 赠送给朋友\n\n如果你保持活跃，积分永不过期！🎯' },
    tags: ['points', 'rewards', 'earning'],
    relatedErrandStatus: ['completed'],
  },
  {
    id: 'points-redeem',
    category: 'points-rewards',
    question: { en: 'How do I redeem my Points?', zh: '我如何兑换我的积分？' },
    answer: { en: 'Redeeming Points is easy and rewarding!\n\n🎁 Options:\n• $5 off: 100 points\n• $15 off: 250 points\n• $35 off: 500 points\n• Premium badge: 200 points\n• Ad-free month: 180 points\n• Gift cards: 300+ points\n\n💬 How to redeem:\n1. Go to Profile > My Points\n2. Tap "Redeem"\n3. Choose reward\n4. Confirm\n5. Enjoy!\n\n⚡ Pro tips:\n• Combine points for bigger rewards\n• Watch for double-point events\n• Share points with friends\n\nYour Points are valuable! 💎', zh: '兑换积分很容易且有回报！\n\n🎁 选项：\n• $5折扣：100积分\n• $15折扣：250积分\n• $35折扣：500积分\n• 高级徽章：200积分\n• 无广告月份：180积分\n• 礼品卡：300+积分\n\n💬 如何兑换：\n1. 转到档案 > 我的积分\n2. 点击"兑换"\n3. 选择奖励\n4. 确认\n5. 享受！\n\n⚡ 专业提示：\n• 合并积分以获得更大奖励\n• 关注双倍积分活动\n• 与朋友分享积分\n\n你的积分很有价值！💎' },
    tags: ['points', 'redemption', 'rewards'],
    relatedErrandStatus: ['any'],
  },

  // CANCELLATION & REFUNDS (2)
  {
    id: 'cancel-errand-basics',
    category: 'cancel-refund',
    question: { en: 'Can I cancel an errand?', zh: '我可以取消任务吗？' },
    answer: { en: 'Yes, you can cancel errands in certain situations:\n\n⏱️ Cancellation rules:\n• Before offers: FREE cancellation anytime\n• Within 2 hours of acceptance: FREE\n• After 2 hours: 20% fee (80% refunded)\n• After 24 hours: 50% fee (50% refunded)\n• Work 75%+ done: No refund\n\n💬 How to cancel:\n1. Go to errand details\n2. Tap "Cancel Errand"\n3. Select reason\n4. Add optional message\n5. Confirm\n\n💡 Pro tips:\n• Cancel early to avoid fees\n• Communicate with doer\n• Be respectful\n\n❓ If doer cancels: 100% refund! 💪', zh: '是的，你可以在某些情况下取消任务：\n\n⏱️ 取消规则：\n• 接受出价前：随时免费取消\n• 接受后2小时内：免费\n• 2小时后：20%费用（80%退款）\n• 24小时后：50%费用（50%退款）\n• 工作75%以上完成：无退款\n\n💬 如何取消：\n1. 转到帮帮详情\n2. 点击"取消帮帮"\n3. 选择原因\n4. 添加可选消息\n5. 确认\n\n💡 专业提示：\n• 尽早取消以避免费用\n• 与帮手沟通\n• 保持尊重\n\n❓ 如果帮手取消：100%退款！💪' },
    tags: ['cancellation', 'refund', 'policy'],
    relatedErrandStatus: ['posted', 'bidding', 'accepted'],
  },
  {
    id: 'cancel-fees-explained',
    category: 'cancel-refund',
    question: { en: 'What are the cancellation fees?', zh: '取消费用是多少？' },
    answer: { en: 'Cancellation fees depend on when you cancel:\n\n💰 Fee structure:\n0% fee: Before offers, within 2 hours of acceptance\n20% fee: 2-24 hours after acceptance\n50% fee: 24+ hours after acceptance\n100% charge: Work 75%+ complete\n\n📊 Example ($100 errand):\n• Cancel before offers: $100 refund\n• Cancel within 2 hrs: $100 refund\n• Cancel 12 hrs later: $80 refund\n• Cancel after 24 hrs: $50 refund\n\n💡 How to minimize:\n• Cancel within 2-hour grace period\n• Communicate early\n• Be clear about timeline\n\nWe protect both parties! ⚖️', zh: '取消费用取决于你何时取消：\n\n💰 费用结构：\n0%费用：接受出价前，接受后2小时内\n20%费用：接受后2-24小时\n50%费用：接受后24小时以上\n100%费用：工作75%以上完成\n\n📊 示例（$100帮帮）：\n• 取消前的出价：$100退款\n• 2小时内取消：$100退款\n• 12小时后取消：$80退款\n• 24小时后取消：$50退款\n\n💡 如何最小化：\n• 在2小时宽限内取消\n• 提前沟通\n• 清楚说明时间表\n\n我们保护双方！⚖️' },
    tags: ['cancellation', 'fees', 'financial'],
    relatedErrandStatus: ['accepted', 'in-progress'],
  },

  // RATINGS & REVIEWS (2)
  {
    id: 'rating-how-works',
    category: 'ratings-reviews',
    question: { en: 'How does the rating system work?', zh: '评级系统如何运作？' },
    answer: { en: '⭐ Our 5-star rating system:\n\n5 stars: Excellent! Perfect work, great communication\n4 stars: Very good - good work, minor issues\n3 stars: Good - acceptable work, some issues\n2 stars: Fair - below expectations\n1 star: Poor - very low quality\n\n📝 Writing reviews:\n1. Rate from 1-5 stars\n2. Choose specific criteria\n3. Write honest feedback\n4. Be respectful always\n5. Post review\n\n💡 Tips:\n• Be specific, not just "great!"\n• Mention positives & negatives\n• Focus on the service/work\n• Stay professional\n\nYour honest feedback helps everyone! ⭐', zh: '⭐ 我们的5星评级系统：\n\n5星：很好！完美的工作，很好的沟通\n4星：很好 - 好的工作，轻微问题\n3星：好的 - 可接受的工作，一些问题\n2星：公平 - 低于预期\n1星：很差 - 质量很低\n\n📝 编写评论：\n1. 从1-5星评分\n2. 选择特定标准\n3. 写诚实的反馈\n4. 始终尊重\n5. 发布评论\n\n💡 提示：\n• 具体，不只是"很好！"\n• 提及正面和负面\n• 专注于服务/工作\n• 保持专业\n\n你诚实的反馈可以帮助每个人！⭐' },
    tags: ['ratings', 'reviews', 'quality'],
    relatedErrandStatus: ['completed'],
  },
  {
    id: 'improve-rating',
    category: 'ratings-reviews',
    question: { en: 'How can I improve my rating?', zh: '我如何改进我的评级？' },
    answer: { en: 'Build a stellar reputation with these strategies:\n\n⭐ To get 5-star ratings:\n📋 Before:\n• Confirm all details\n• Clarify expectations\n• Set realistic timelines\n\n💼 During:\n• Communicate regularly\n• Send progress updates\n• Be professional\n• Solve problems promptly\n\n✅ After:\n• Present finished work\n• Ask for feedback\n• Make small fixes if needed\n• Thank the customer\n\n💡 Common mistakes:\n❌ No communication\n❌ Late delivery\n❌ Poor quality\n❌ Attitude issues\n\nGreat ratings = great work + great attitude! 🌟', zh: '通过这些策略建立卓越的声誉：\n\n⭐ 获得5星评级：\n📋 工作前：\n• 确认所有细节\n• 澄清期望\n• 设定现实的时间表\n\n💼 工作期间：\n• 定期沟通\n• 发送进度更新\n• 保持专业\n• 快速解决问题\n\n✅ 完成后：\n• 呈现完成的工作\n• 征求反馈\n• 必要时进行小的改进\n• 感谢客户\n\n💡 常见错误：\n❌ 无沟通\n❌ 延迟交付\n❌ 质量差\n❌ 态度问题\n\n优秀的评级=优秀的工作+优秀的态度！🌟' },
    tags: ['ratings', 'improvement', 'tips'],
    relatedErrandStatus: ['completed'],
  },

  // REFERRALS & EARNINGS (2)
  {
    id: 'refer-earn',
    category: 'refer-earn',
    question: { en: 'How do I earn from referrals?', zh: '我如何从推荐中赚取？' },
    answer: { en: 'Share Errandify and earn!\n\n🎁 Referral earnings:\n• Refer a friend: +50 points\n• They complete first errand: +150 points\n• Total: 200 points per referral\n\n💰 How to refer:\n1. Go to Profile > Referrals\n2. Copy your unique code\n3. Share with friends\n4. When they join & complete, you earn!\n\n📊 Tracking:\n• See referral history\n• Track earnings\n• View redemptions\n\n💡 Tips:\n• Share on social media\n• Tell friends directly\n• No limit on referrals!\n\nBuild passive income! 💪', zh: '分享帮帮乐并赚取！\n\n🎁 推荐收入：\n• 推荐朋友：+50积分\n• 他们完成第一个帮帮：+150积分\n• 总计：每次推荐200积分\n\n💰 如何推荐：\n1. 转到档案 > 推荐\n2. 复制你的唯一代码\n3. 与朋友分享\n4. 他们加入并完成时，你赚取！\n\n📊 追踪：\n• 查看推荐历史\n• 追踪收入\n• 查看兑换\n\n💡 提示：\n• 在社交媒体上分享\n• 直接告诉朋友\n• 推荐没有限制！\n\n建立被动收入！💪' },
    tags: ['referral', 'earning', 'growth'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'refer-track',
    category: 'refer-earn',
    question: { en: 'How do I track my referrals?', zh: '我如何追踪我的推荐？' },
    answer: { en: 'Track all your referrals easily!\n\n📊 Referral dashboard:\n• Total referrals made\n• Active referrals\n• Completed referrals\n• Points earned\n• Pending payouts\n\n📈 Analytics:\n• Referral history\n• Earning timeline\n• Most active periods\n• Conversion rate\n\n💬 Referral codes:\n• Unique code per user\n• Share on multiple platforms\n• Track clicks & sign-ups\n• Real-time updates\n\n💡 Pro tips:\n• Different codes per channel\n• Share during peak times\n• Tell friends why you use it!\n\nMaximize your earnings! 💰', zh: '轻松追踪所有推荐！\n\n📊 推荐仪表板：\n• 总推荐数\n• 活跃推荐\n• 已完成推荐\n• 赚取的积分\n• 待定支付\n\n📈 分析：\n• 推荐历史\n• 收入时间表\n• 最活跃时期\n• 转换率\n\n💬 推荐代码：\n• 每个用户唯一代码\n• 在多个平台上分享\n• 追踪点击和注册\n• 实时更新\n\n💡 专业提示：\n• 每个渠道不同代码\n• 在峰值时间分享\n• 告诉朋友为什么你使用它！\n\n最大化你的收入！💰' },
    tags: ['referral', 'tracking', 'earnings'],
    relatedErrandStatus: ['any'],
  },

  // TECHNICAL HELP (2)
  {
    id: 'app-crash',
    category: 'technical-help',
    question: { en: 'What do I do if the app crashes?', zh: '如果应用程序崩溃我该怎么办？' },
    answer: { en: 'App crashes happen! Here\'s what to do:\n\n🔧 Quick fixes:\n1. Force close & restart\n2. Check your connection\n3. Update the app\n4. Clear cache (not data!)\n5. Restart your phone\n\n💻 If crash keeps happening:\n1. Note the error message\n2. Screenshot it\n3. Note what you were doing\n4. Contact support\n\n📲 Contact support:\n• Email: support@errandify.com\n• Include: Device, app version, error message\n\nWe\'re here to help! 🤝', zh: '应用程序崩溃会发生！以下是应该做的：\n\n🔧 快速修复：\n1. 强制关闭并重新启动\n2. 检查你的连接\n3. 更新应用程序\n4. 清除缓存（不是数据！）\n5. 重启你的手机\n\n💻 如果崩溃持续：\n1. 记下错误信息\n2. 截图\n3. 记下你在做什么\n4. 联系支持\n\n📲 联系支持：\n• 电子邮件：support@errandify.com\n• 包括：设备、应用版本、错误信息\n\n我们在这里帮助你！🤝' },
    tags: ['technical', 'troubleshooting', 'support'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'notifications-settings',
    category: 'technical-help',
    question: { en: 'How do I control notifications?', zh: '我如何控制通知？' },
    answer: { en: 'Customize your notifications:\n\n🔔 Notification types:\n• New offers received\n• Errand accepted\n• Payment confirmed\n• Messages\n• Ratings posted\n• Disputes\n\n📱 In-app settings:\n1. Open Errandify\n2. Go to Settings\n3. Select "Notifications"\n4. Toggle on/off what you want\n5. Set quiet hours\n6. Choose frequency\n\n💡 Options:\n✓ Keep: Urgent messages, payments, safety\n✗ Can disable: Marketing, promos, digest\n\n🔒 Important:\n• Critical alerts always on\n• Emergency calls still ring\n\nYou control your notifications! 🎛️', zh: '自定义你的通知：\n\n🔔 通知类型：\n• 收到新出价\n• 帮帮被接受\n• 支付已确认\n• 消息\n• 评级已发布\n• 纠纷\n\n📱 应用内设置：\n1. 打开帮帮乐\n2. 转到设置\n3. 选择"通知"\n4. 切换你想要的\n5. 设置安静时间\n6. 选择频率\n\n💡 选项：\n✓ 保持：紧急消息、支付、安全\n✗ 可以禁用：营销、促销、摘要\n\n🔒 重要：\n• 关键警报始终打开\n• 紧急电话仍然响起\n\n你控制你的通知！🎛️' },
    tags: ['technical', 'notifications', 'settings'],
    relatedErrandStatus: ['any'],
  },

  // COMPANY FEATURES (2)
  {
    id: 'company-bulk-posting',
    category: 'company-features',
    question: { en: 'Can companies post multiple errands at once?', zh: '公司可以一次发布多个任务吗？' },
    answer: { en: 'Yes! Companies can post errands in bulk.\n\n🏢 Bulk posting features:\n• Post 5-100 errands at once\n• Template-based creation\n• CSV upload support\n• Batch scheduling\n• Discount pricing\n\n💼 How it works:\n1. Go to Company > Bulk Post\n2. Upload CSV or use template\n3. Review all errands\n4. Set budget & schedule\n5. Submit batch\n\n📊 Benefits:\n• Save time\n• Consistent quality\n• Better pricing\n• Automated scheduling\n\n💡 Requirements:\n• Company account\n• 20+ employees\n• Verified payment\n\nScale your operations! 🚀', zh: '是的！公司可以批量发布帮帮。\n\n🏢 批量发布功能：\n• 一次发布5-100个帮帮\n• 基于模板的创建\n• CSV上传支持\n• 批量调度\n• 折扣定价\n\n💼 它的工作原理：\n1. 转到公司 > 批量发布\n2. 上传CSV或使用模板\n3. 审查所有帮帮\n4. 设定预算和时间表\n5. 提交批次\n\n📊 好处：\n• 节省时间\n• 一致的质量\n• 更好的定价\n• 自动化调度\n\n💡 要求：\n• 公司账户\n• 20+员工\n• 已验证的支付\n\n扩大你的运营！🚀' },
    tags: ['company', 'bulk-posting', 'enterprise'],
    relatedErrandStatus: ['any'],
  },
  {
    id: 'company-team',
    category: 'company-features',
    question: { en: 'How do I manage my company team?', zh: '我如何管理我的公司团队？' },
    answer: { en: 'Manage your company team easily!\n\n👥 Team management:\n• Add team members\n• Assign roles (admin, poster, viewer)\n• Set permissions\n• Track activity\n• Manage billing\n\n📋 How to add team:\n1. Go to Company > Team\n2. Click "Add Member"\n3. Enter email & name\n4. Assign role\n5. Send invite\n\n🔒 Roles & permissions:\n• Admin: Full access\n• Poster: Create & manage errands\n• Viewer: View reports only\n• Billing: Manage payments\n\n💡 Features:\n• Real-time collaboration\n• Activity audit log\n• Separate billing roles\n• Invite history\n\nWork as a team! 💪', zh: '轻松管理你的公司团队！\n\n👥 团队管理：\n• 添加团队成员\n• 分配角色（管理员、发布者、查看者）\n• 设定权限\n• 追踪活动\n• 管理账单\n\n📋 如何添加团队：\n1. 转到公司 > 团队\n2. 点击"添加成员"\n3. 输入电子邮件和名称\n4. 分配角色\n5. 发送邀请\n\n🔒 角色和权限：\n• 管理员：完全访问\n• 发布者：创建和管理帮帮\n• 查看者：仅查看报告\n• 账单：管理付款\n\n💡 功能：\n• 实时协作\n• 活动审计日志\n• 独立账单角色\n• 邀请历史\n\n作为一个团队工作！💪' },
    tags: ['company', 'team-management', 'enterprise'],
    relatedErrandStatus: ['any'],
  },
];

export default COMPREHENSIVE_FAQ;
