// Comprehensive FAQ Database for Hana
// Dynamic, bilingual (English/中文/粵語), organized by topics
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
  // ===== POSTING AN ERRAND =====
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
      en: 'The more details you provide, the better bids you\'ll get! Here\'s what works well:\n\n✓ **Be specific**: Instead of "cleaning", say "3-room apartment deep clean, focus on kitchen"\n✓ **Set clear expectations**: What exactly needs to be done? What\'s included?\n✓ **Mention any special requirements**: Allergies, pet-friendly tools, specific brands, etc.\n✓ **Add photos**: A picture is worth 1000 words! Show what needs work\n✓ **Be honest about difficulty**: Is this a simple task or complex?\n✓ **Mention location details**: Parking, building access, etc.\n✓ **Specify deadline**: "Today by 6pm" vs "sometime this week"\n\nClear descriptions = Better bids = Happier outcomes! 🎯',
      zh: '你提供的细节越多，你得到的出价就越好！以下是有效的方法：\n\n✓ **具体一点**：不是"清洁"，而是"3室公寓深层清洁，重点是厨房"\n✓ **设定清晰的期望**：具体需要做什么？包括什么？\n✓ **提及任何特殊要求**：过敏症、宠物友好工具、特定品牌等\n✓ **添加照片**：一张图片胜过一千个词！展示需要工作的地方\n✓ **诚实说明难度**：这是一个简单的任务还是复杂的任务？\n✓ **提及位置细节**：停车、建筑物进出等\n✓ **指定截止日期**："今天下午6点前"与"这周某个时候"\n\n清晰的描述=更好的出价=更幸福的结果！🎯',
      yue: '你提供嘅細節越多，你得到嘅出價就越好！以下係有效嘅方法：\n\n✓ **具體啲**：唔係"清潔"，而係"3室公寓深層清潔，重點係廚房"\n✓ **設定清晰嘅期望**：具體需要做咩？包括咩？\n✓ **提及任何特殊要求**：過敏症、寵物友好工具、特定品牌等\n✓ **添加相片**：一張圖片勝過一千個詞！展示需要工作嘅地方\n✓ **誠實說明難度**：呢個係一個簡單嘅任務定係複雜嘅任務？\n✓ **提及位置細節**：停車、建築物進出等\n✓ **指定截止日期**："今日下午6點前"與"呢個星期某個時候"\n\n清晰嘅描述=更好嘅出價=更幸福嘅結果！🎯',
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
      en: 'Setting the right budget helps you get quality bids! Here\'s our guide:\n\n📊 **Research first**: Look at similar errands posted to see what\'s typical\n💭 **Consider complexity**: Simple tasks = lower budget, complex tasks = higher budget\n⏰ **Think about time**: Longer jobs or rush requests may cost more\n🌍 **Factor in location**: Urban areas might be pricier than suburbs\n🤝 **Respect the doers**: Remember, these are real people doing real work\n\n**Tip**: You can see suggested budget ranges when posting. Start with the suggested range and adjust based on urgency and complexity.\n\nRemember: A slightly higher budget often means better quality work and faster service! 💪',
      zh: '设定正确的预算有助于获得优质出价！以下是我们的指南：\n\n📊 **先研究**：查看类似的已发布任务，了解典型价格\n💭 **考虑复杂性**：简单任务=较低预算，复杂任务=较高预算\n⏰ **考虑时间**：较长的工作或紧急请求可能成本更高\n🌍 **考虑位置因素**：城市地区可能比郊区更昂贵\n🤝 **尊重帮手**：记住，这些是做真实工作的真实的人\n\n**提示**：发布时，你可以看到建议的预算范围。从建议范围开始，根据紧迫性和复杂性进行调整。\n\n记住：稍高的预算通常意味着更好的工作质量和更快的服务！💪',
      yue: '設定正確嘅預算有助於獲得優質出價！以下係我哋嘅指南：\n\n📊 **先研究**：查睇類似嘅已發佈幫幫，了解典型價格\n💭 **考慮複雜性**：簡單任務=較低預算，複雜任務=較高預算\n⏰ **考慮時間**：較長嘅工作或緊急請求可能成本更高\n🌍 **考慮位置因素**：城市地區可能比郊區更昂貴\n🤝 **尊重幫手**：記住，呢啲係做真實工作嘅真實嘅人\n\n**提示**：發佈時，你可以睇到建議嘅預算範圍。由建議範圍開始，根據緊迫性同複雜性進行調整。\n\n記住：稍高嘅預算通常意味著更好嘅工作質量同更快嘅服務！💪',
    },
    tags: ['posting', 'budget', 'pricing'],
    relatedErrandStatus: ['draft'],
  },

  // ===== BIDDING & ACCEPTING =====
  {
    id: 'bidding-how-works',
    category: 'bidding-accepting',
    question: {
      en: 'How does bidding work on Errandify?',
      zh: '在帮帮乐上出价是如何运作的？',
      yue: '喺帮帮乐上出價係點樣運作嘅？',
    },
    answer: {
      en: 'Bidding is how doers show their interest in doing your errand! Here\'s the flow:\n\n1. **You post** an errand with details and budget\n2. **Doers see** your errand and can place a bid\n3. **You review** all the bids, doer profiles, and ratings\n4. **You choose** your preferred doer by accepting their bid\n5. **Work begins** - you and your doer coordinate and complete the task\n6. **Payment happens** once work is approved\n\nYou\'re in control! You only pay when you\'re happy with the work. Think of it like hiring the person you feel most confident about. 💼\n\n**Pro tip**: High ratings and completed jobs often means the doer is reliable!',
      zh: '出价是帮手表示对你的帮帮感兴趣的方式！流程如下：\n\n1. **你发布**一个有详细信息和预算的帮帮\n2. **帮手看到**你的帮帮并可以出价\n3. **你审查**所有出价、帮手档案和评级\n4. **你选择**你首选的帮手来接受他们的出价\n5. **工作开始** - 你和你的帮手协调并完成任务\n6. **支付发生** 一旦工作被批准\n\n你掌握权力！你只有在满意工作时才会支付。把它想象成招聘你最有信心的人。💼\n\n**专业提示**：高评级和已完成的工作通常意味着帮手是可靠的！',
      yue: '出價係帮手表示對你嘅幫幫感興趣嘅方式！流程如下：\n\n1. **你發佈**一個有詳細信息同預算嘅幫幫\n2. **幫手睇到**你嘅幫幫並可以出價\n3. **你審查**所有出價、幫手檔案同評級\n4. **你選擇**你首選嘅幫手嚟接受佢哋嘅出價\n5. **工作開始** - 你同你嘅幫手協調同完成任務\n6. **支付發生** 一旦工作被批准\n\n你掌握權力！你只有喺滿意工作時先會支付。把佢想像成招聘你最有信心嘅人。💼\n\n**專業提示**：高評級同已完成嘅工作通常意味著幫手係可靠嘅！',
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
      en: 'Choosing the right doer is important! Here\'s what to look at:\n\n⭐ **Ratings & Reviews**: Look at their star rating and what others say\n✓ **Completed Jobs**: How many errands have they successfully completed?\n💬 **Bid Message**: Some doers add a note - read it! Shows they care\n💰 **Price**: Is it competitive? Too low might mean low quality, too high isn\'t necessary\n👤 **Profile**: Check out their profile - do they seem trustworthy?\n🎯 **Relevant Experience**: Have they done similar work before?\n\n**Our tip**: Don\'t always pick the cheapest! Mid-range bids with good ratings often give the best value. A slightly higher price often means better quality and reliability.\n\nTrust your gut! If their profile feels right, they probably are. 🎯',
      zh: '选择合适的帮手很重要！以下是要看的：\n\n⭐ **评级与评论**：查看他们的星级评分和他人的评论\n✓ **已完成的工作**：他们已成功完成多少项帮帮？\n💬 **出价信息**：一些帮手会添加备注 - 阅读它！显示他们很在乎\n💰 **价格**：它有竞争力吗？太低可能意味着质量低，太高没必要\n👤 **档案**：查看他们的档案 - 他们看起来值得信赖吗？\n🎯 **相关经验**：他们之前做过类似的工作吗？\n\n**我们的提示**：不要总是选择最便宜的！中等价位的出价加上好评通常能提供最佳价值。稍高的价格通常意味着更好的质量和可靠性。\n\n相信你的直觉！如果他们的档案感觉不错，他们可能就是。🎯',
      yue: '選擇合適嘅幫手好重要！以下係要睇嘅：\n\n⭐ **評級與評論**：查睇佢哋嘅星級評分同他人嘅評論\n✓ **已完成嘅工作**：佢哋已成功完成幾多項幫幫？\n💬 **出價信息**：一啲幫手會添加備註 - 閱讀佢！顯示佢哋好在乎\n💰 **價格**：佢有競爭力嗎？太低可能意味著質量低，太高冇必要\n👤 **檔案**：查睇佢哋嘅檔案 - 佢哋睇起來值得信賴嗎？\n🎯 **相關經驗**：佢哋之前做過類似嘅工作嗎？\n\n**我哋嘅提示**：唔好淨係選擇最便宜嘅！中等價位嘅出價加上好評通常能提供最佳價值。稍高嘅價格通常意味著更好嘅質量同可靠性。\n\n相信你嘅直覺！如果佢哋嘅檔案感覺唔錯，佢哋可能就係。🎯',
    },
    tags: ['bidding', 'tips', 'best-practices'],
    relatedErrandStatus: ['bidding'],
  },

  // ===== PAYMENT & WALLET =====
  {
    id: 'payment-how-safe',
    category: 'payment-wallet',
    question: {
      en: 'Is my payment safe? When do I pay?',
      zh: '我的付款安全吗？我什么时候付款？',
      yue: '我嘅付款安全嗎？我幾時付款？',
    },
    answer: {
      en: 'Your payment is completely safe! Here\'s how it works:\n\n🛡️ **Protected Process**: Your money stays with us until work is done and approved\n\n💰 **Payment flow**:\n1. You accept a bid\n2. We hold the payment securely in escrow\n3. Doer completes the work\n4. You approve the work (after checking quality)\n5. Payment is released to the doer\n6. You\'re both happy!\n\n✅ **You\'re protected**: If there\'s an issue, we\'re here to help. No payment leaves your account without your approval.\n\n🔒 **Security**: We use industry-standard encryption and payment processors. Your payment information is never shared with the doer.\n\n**Key point**: You never pay upfront. You only pay after you\'re satisfied with the work! This is your protection. 💪',
      zh: '你的付款完全安全！下面是它的工作原理：\n\n🛡️ **受保护的流程**：你的钱在我们这里保管，直到工作完成并得到批准\n\n💰 **付款流程**：\n1. 你接受一个出价\n2. 我们安全地在第三方托管中保管付款\n3. 帮手完成工作\n4. 你批准工作（检查质量后）\n5. 付款被释放给帮手\n6. 你们都很高兴！\n\n✅ **你受保护**：如果有问题，我们会帮你。没有你的批准，任何付款都不会离开你的账户。\n\n🔒 **安全性**：我们使用行业标准的加密和支付处理器。你的付款信息从不与帮手共享。\n\n**关键点**：你永远不需要预先付款。你只在满意工作后才付款！这是你的保护。💪',
      yue: '你嘅付款完全安全！下面係佢嘅工作原理：\n\n🛡️ **受保護嘅流程**：你嘅錢喺我哋呢度保管，直到工作完成並得到批准\n\n💰 **付款流程**：\n1. 你接受一個出價\n2. 我哋安全地喺第三方托管中保管付款\n3. 幫手完成工作\n4. 你批准工作（檢查質量後）\n5. 付款被釋放畀幫手\n6. 你哋都好開心！\n\n✅ **你受保護**：如果有問題，我哋會幫你。冇你嘅批准，任何付款都唔會離開你嘅賬戶。\n\n🔒 **安全性**：我哋使用行業標準嘅加密同支付處理器。你嘅付款信息從唔與幫手共享。\n\n**關鍵點**：你永遠唔需要預先付款。你只喺滿意工作後先付款！呢個係你嘅保護。💪',
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
      en: 'Managing your wallet is easy!\n\n📱 **Check your balance**:\n1. Tap your profile icon (bottom right)\n2. Select "Wallet" or "My Wallet"\n3. You\'ll see your current balance and transaction history\n\n💳 **Add money**:\n1. Go to your Wallet\n2. Tap "Add Money" or "Top Up"\n3. Choose your amount\n4. Select payment method (credit card, debit card, bank transfer, etc.)\n5. Confirm and your money is added!\n\n✨ **Bonus**: Your wallet stays loaded, so you\'re always ready to pay quickly when you accept a bid.\n\n📊 **Transaction history**: You can see all your past payments and refunds anytime.\n\n**All transactions are secure and encrypted!** 🔒',
      zh: '管理你的钱包很容易！\n\n📱 **检查你的余额**：\n1. 点击你的档案图标（右下角）\n2. 选择"钱包"或"我的钱包"\n3. 你会看到你的当前余额和交易历史\n\n💳 **添加金钱**：\n1. 转到你的钱包\n2. 点击"添加金钱"或"充值"\n3. 选择你的金额\n4. 选择支付方法（信用卡、借记卡、银行转账等）\n5. 确认，你的金钱就被添加了！\n\n✨ **奖励**：你的钱包保持充足状态，所以你总是准备好在接受出价时快速支付。\n\n📊 **交易历史**：你可以随时查看所有过去的付款和退款。\n\n**所有交易都是安全和加密的！**🔒',
      yue: '管理你嘅錢包好容易！\n\n📱 **檢查你嘅結餘**：\n1. 點擊你嘅檔案圖標（右下角）\n2. 選擇"錢包"或"我嘅錢包"\n3. 你會睇到你嘅當前結餘同交易歷史\n\n💳 **添加金錢**：\n1. 轉到你嘅錢包\n2. 點擊"添加金錢"或"充值"\n3. 選擇你嘅金額\n4. 選擇支付方法（信用卡、借記卡、銀行轉賬等）\n5. 確認，你嘅金錢就被添加咗！\n\n✨ **獎勵**：你嘅錢包保持充足狀態，所以你總係準備好喺接受出價時快速支付。\n\n📊 **交易歷史**：你可以隨時查睇所有過去嘅付款同退款。\n\n**所有交易都係安全同加密嘅！**🔒',
    },
    tags: ['wallet', 'payment', 'top-up'],
    relatedErrandStatus: ['any'],
  },

  // ===== ACCOUNT & PROFILE =====
  {
    id: 'account-setup',
    category: 'account-profile',
    question: {
      en: 'How do I set up my Errandify account?',
      zh: '我如何设置我的帮帮乐账户？',
      yue: '我點樣設置我嘅幫幫樂賬戶？',
    },
    answer: {
      en: 'Getting started is quick and easy!\n\n📝 **Registration**:\n1. Download the Errandify app or visit our website\n2. Tap "Sign Up"\n3. Enter your email or phone number\n4. Create a strong password\n5. Verify your email/phone (we send a code)\n\n👤 **Complete your profile**:\n1. Add a profile photo (smiling works great! 😊)\n2. Write a short bio (who you are, what you do)\n3. Add your location and availability\n4. Link a payment method\n\n✅ **You\'re ready!**\nNow you can post errands or start bidding on ones posted by others.\n\n**Pro tips**:\n• Complete profile = More trust from other users\n• Verified phone = Extra safety badge\n• Profile photo = 3x more responses!\n\nWelcome to Errandify! We\'re excited to have you. 🎉',
      zh: '入门很快很容易！\n\n📝 **注册**：\n1. 下载帮帮乐应用或访问我们的网站\n2. 点击"注册"\n3. 输入你的电子邮件或电话号码\n4. 创建一个强密码\n5. 验证你的电子邮件/电话（我们会发送代码）\n\n👤 **完成你的档案**：\n1. 添加档案照片（微笑效果很好！😊）\n2. 写一个简短的自我介绍（你是谁，你做什么）\n3. 添加你的位置和可用时间\n4. 链接支付方法\n\n✅ **你准备好了！**\n现在你可以发布帮帮或开始对其他人发布的帮帮进行出价。\n\n**专业提示**：\n• 完整的档案 = 其他用户更信任\n• 经过验证的电话 = 额外的安全徽章\n• 档案照片 = 反应增加3倍！\n\n欢迎来到帮帮乐！我们很高兴有你。🎉',
      yue: '入門好快好容易！\n\n📝 **註冊**：\n1. 下載幫幫樂應用或訪問我哋嘅網站\n2. 點擊"註冊"\n3. 輸入你嘅電子郵件或電話號碼\n4. 創建一個強密碼\n5. 驗證你嘅電子郵件/電話（我哋會發送代碼）\n\n👤 **完成你嘅檔案**：\n1. 添加檔案相片（微笑效果好好！😊）\n2. 寫一個簡短嘅自我介紹（你係誰，你做咩）\n3. 添加你嘅位置同可用時間\n4. 鏈接支付方法\n\n✅ **你準備好咗！**\n而今你可以發佈幫幫或開始對其他人發佈嘅幫幫進行出價。\n\n**專業提示**：\n• 完整嘅檔案 = 其他用戶更信任\n• 經過驗證嘅電話 = 額外嘅安全徽章\n• 檔案相片 = 反應增加3倍！\n\n歡迎來到幫幫樂！我哋好高興有你。🎉',
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
      en: 'Verification builds trust on Errandify!\n\n✅ **Why verify?**\n• Shows other users you\'re legitimate\n• Gets you the ✓ verification badge\n• Increases job/bid success rates\n• Unlocks higher earning potential\n• Extra security for everyone\n\n📱 **How to get verified**:\n1. Go to your Profile\n2. Tap "Get Verified" or "Security"\n3. Follow these steps:\n   - **Phone verification**: Enter your phone number, confirm the code we send\n   - **ID verification**: Upload a photo of your ID (passport, license, etc.)\n   - **Address verification**: Confirm your address (we may send a postcard)\n   - **Payment method**: Link and verify a valid payment card\n\n✨ **What happens next?**\nWe review your information (usually within 24 hours). Once approved, you get the ✓ badge and full access to all features!\n\n🔒 **Your information is safe**: We use encryption and never share personal details with others.\n\nVerification is quick and builds confidence! 💪',
      zh: '验证在帮帮乐上建立信任！\n\n✅ **为什么要验证？**\n• 向其他用户展示你是合法的\n• 获得✓验证徽章\n• 增加工作/出价成功率\n• 解锁更高的收入潜力\n• 为所有人提供额外安全\n\n📱 **如何获得验证**：\n1. 转到你的档案\n2. 点击"获得验证"或"安全性"\n3. 按照以下步骤：\n   - **电话验证**：输入你的电话号码，确认我们发送的代码\n   - **ID验证**：上传你的ID照片（护照、驾照等）\n   - **地址验证**：确认你的地址（我们可能会发送明信片）\n   - **支付方法**：链接并验证有效的支付卡\n\n✨ **接下来会发生什么？**\n我们审查你的信息（通常在24小时内）。获批后，你获得✓徽章并可以完全访问所有功能！\n\n🔒 **你的信息是安全的**：我们使用加密，从不与他人共享个人详情。\n\n验证既快又能建立信心！💪',
      yue: '驗證喺幫幫樂上建立信任！\n\n✅ **點解要驗證？**\n• 向其他用戶展示你係合法嘅\n• 獲得✓驗證徽章\n• 增加工作/出價成功率\n• 解鎖更高嘅收入潛力\n• 為所有人提供額外安全\n\n📱 **點樣獲得驗證**：\n1. 轉到你嘅檔案\n2. 點擊"獲得驗證"或"安全性"\n3. 按照以下步驟：\n   - **電話驗證**：輸入你嘅電話號碼，確認我哋發送嘅代碼\n   - **ID驗證**：上載你嘅ID相片（護照、駕駛執照等）\n   - **地址驗證**：確認你嘅地址（我哋可能會發送明信片）\n   - **支付方法**：鏈接並驗證有效嘅支付卡\n\n✨ **接下來會發生咩？**\n我哋審查你嘅信息（通常喺24小時內）。獲批後，你獲得✓徽章並可以完全訪問所有功能！\n\n🔒 **你嘅信息係安全嘅**：我哋使用加密，從唔與他人共享個人詳情。\n\n驗證既快又能建立信心！💪',
    },
    tags: ['verification', 'security', 'account'],
    relatedErrandStatus: ['any'],
  },

  // ===== SAFETY & TRUST =====
  {
    id: 'safety-guidelines',
    category: 'safety-trust',
    question: {
      en: 'How can I stay safe on Errandify?',
      zh: '我如何在帮帮乐上保持安全？',
      yue: '我點樣喺幫幫樂上保持安全？',
    },
    answer: {
      en: '🛡️ Your safety is our top priority! Here are essential tips:\n\n✅ **Before accepting/bidding**:\n• Check the other person\'s profile and ratings\n• Read their reviews - what do others say?\n• Trust your gut - if something feels off, skip it\n• Look for the ✓ verification badge\n\n✅ **During the errand**:\n• Meet in public places when possible\n• Tell a friend where you\'re going\n• Keep conversations on the app (not personal numbers)\n• Stay aware of your surroundings\n• Take photos of work completed (protects both of you!)\n\n✅ **Payment safety**:\n• Never pay outside the app\n• Never share payment details directly\n• Always use Errandify\'s payment system\n• Never give access to your account\n\n✅ **If something feels wrong**:\n• Use the "Report" button on their profile\n• Contact our support team immediately\n• Don\'t continue if you\'re uncomfortable\n• We take safety seriously and will investigate\n\n🆘 **Emergency?** \nUse our SOS button (red button at top of app) for immediate help.\n\n**Remember: Trust is earned. Take your time to find the right fit!** 💪',
      zh: '🛡️ 你的安全是我们的首要任务！以下是基本提示：\n\n✅ **接受/出价前**：\n• 检查对方的档案和评级\n• 阅读他们的评论 - 其他人怎么说？\n• 相信你的直觉 - 如果感觉不对，就跳过\n• 寻找✓验证徽章\n\n✅ **在任务期间**：\n• 尽可能在公共场所见面\n• 告诉朋友你要去的地方\n• 在应用上保持对话（不要个人电话号码）\n• 保持警惕\n• 拍摄完成工作的照片（保护双方！）\n\n✅ **付款安全**：\n• 不要在应用外支付\n• 不要直接共享支付详情\n• 始终使用帮帮乐的支付系统\n• 不要提供对你账户的访问权限\n\n✅ **如果感觉不对**：\n• 使用他们档案上的"举报"按钮\n• 立即联系我们的支持团队\n• 如果你不舒服，不要继续\n• 我们非常重视安全并会调查\n\n🆘 **紧急情况？**\n使用我们的SOS按钮（应用顶部的红色按钮）获得即时帮助。\n\n**记住：信任是赚取的。花时间找到合适的！** 💪',
      yue: '🛡️ 你嘅安全係我哋嘅首要任務！以下係基本提示：\n\n✅ **接受/出價前**：\n• 檢查對方嘅檔案同評級\n• 閱讀佢哋嘅評論 - 其他人點講？\n• 相信你嘅直覺 - 如果感覺唔啱，就跳過\n• 尋找✓驗證徽章\n\n✅ **喺任務期間**：\n• 盡可能喺公共場所見面\n• 告訴朋友你要去嘅地方\n• 喺應用上保持對話（唔好個人電話號碼）\n• 保持警惕\n• 拍攝完成工作嘅相片（保護雙方！）\n\n✅ **付款安全**：\n• 唔好喺應用外支付\n• 唔好直接共享支付詳情\n• 始終使用幫幫樂嘅支付系統\n• 唔好提供對你賬戶嘅訪問權限\n\n✅ **如果感覺唔啱**：\n• 使用佢哋檔案上嘅"舉報"按鈕\n• 立即聯繫我哋嘅支持團隊\n• 如果你唔舒服，唔好繼續\n• 我哋非常重視安全並會調查\n\n🆘 **緊急情況？**\n使用我哋嘅SOS按鈕（應用頂部嘅紅色按鈕）獲得即時幫助。\n\n**記住：信任係賺取嘅。花時間搵到合適嘅！** 💪',
    },
    tags: ['safety', 'trust', 'important'],
    relatedErrandStatus: ['any'],
  },

  // ===== DISPUTES & ISSUES =====
  {
    id: 'dispute-process',
    category: 'disputes-issues',
    question: {
      en: 'What do I do if there\'s a problem with my errand?',
      zh: '如果我的任务有问题怎么办？',
      yue: '如果我嘅幫幫有問題點樣辦？',
    },
    answer: {
      en: 'Don\'t worry! We have a process to help resolve issues fairly.\n\n📞 **Step 1: Talk it out**\nFirst, try to communicate with the doer through the app:\n• Explain the problem clearly\n• Be respectful and specific\n• Give them a chance to fix it\n• Many issues get resolved this way!\n\n⚠️ **Step 2: Open a dispute** (if talking doesn\'t work)\n1. Go to your errand details\n2. Tap "Report Issue" or "Open Dispute"\n3. Choose the problem type\n4. Provide details and photos if needed\n5. Submit\n\n🔍 **Step 3: We investigate**\n• Our team reviews both sides fairly\n• We may ask you for more information\n• The doer gets to respond too\n• We look at all evidence\n\n✅ **Step 4: Resolution**\nWe make a fair decision:\n• You pay nothing and get a refund\n• You pay a reduced amount\n• You pay the full amount (if work was good)\n• We may give both of you feedback\n\n⏱️ **Timeline**: Usually resolved within 48 hours\n\n💡 **Pro tip**: Keep photos/messages during the work - they help prove your case!\n\n**We\'re fair and neutral. We\'re here to help both parties!** ⚖️',
      zh: '别担心！我们有一个流程来帮助公平解决问题。\n\n📞 **第1步：谈一谈**\n首先，尝试通过应用与帮手沟通：\n• 清楚地解释问题\n• 尊重和具体\n• 给他们一个改正的机会\n• 许多问题都可以这样解决！\n\n⚠️ **第2步：提出纠纷**（如果谈话不起作用）\n1. 转到你的任务详情\n2. 点击"举报问题"或"提出纠纷"\n3. 选择问题类型\n4. 提供详情和照片（如果需要）\n5. 提交\n\n🔍 **第3步：我们调查**\n• 我们的团队公平审查双方\n• 我们可能会要求你提供更多信息\n• 帮手也有机会回应\n• 我们查看所有证据\n\n✅ **第4步：解决**\n我们做出公平的决定：\n• 你不付款并获得退款\n• 你支付减少的金额\n• 你支付全额（如果工作很好）\n• 我们可能会给你们双方反馈\n\n⏱️ **时间线**：通常在48小时内解决\n\n💡 **专业提示**：在工作期间保留照片/消息 - 它们有助于证明你的情况！\n\n**我们公平公正。我们在这里帮助双方！** ⚖️',
      yue: '唔好擔心！我哋有一個流程嚟幫助公平解決問題。\n\n📞 **第1步：谈一谈**\n首先，嘗試通過應用與幫手溝通：\n• 清楚地解釋問題\n• 尊重同具體\n• 畀佢哋一個改正嘅機會\n• 好多問題都可以呢樣解決！\n\n⚠️ **第2步：提出爭議**（如果談話唔起作用）\n1. 轉到你嘅任務詳情\n2. 點擊"舉報問題"或"提出爭議"\n3. 選擇問題類型\n4. 提供詳情同相片（如果需要）\n5. 提交\n\n🔍 **第3步：我哋調查**\n• 我哋嘅團隊公平審查雙方\n• 我哋可能會要求你提供更多信息\n• 幫手都有機會回應\n• 我哋查睇所有證據\n\n✅ **第4步：解決**\n我哋做出公平嘅決定：\n• 你唔付款並獲得退款\n• 你支付減少嘅金額\n• 你支付全額（如果工作好好）\n• 我哋可能會畀你哋雙方反饋\n\n⏱️ **時間線**：通常喺48小時內解決\n\n💡 **專業提示**：喺工作期間保留相片/消息 - 佢哋有助於證明你嘅情況！\n\n**我哋公平公正。我哋喺呢度幫助雙方！** ⚖️',
    },
    tags: ['disputes', 'resolution', 'help'],
    relatedErrandStatus: ['completed', 'disputed'],
  },

  // ===== POINTS & REWARDS =====
  {
    id: 'points-how-earn',
    category: 'points-rewards',
    question: {
      en: 'How do I earn and use Errandify Points?',
      zh: '我如何赚取和使用帮帮乐积分？',
      yue: '我點樣賺取同使用幫幫樂積分？',
    },
    answer: {
      en: '⭐ Errandify Points are like rewards for being part of our community!\n\n💰 **How to earn points**:\n1. **Post an errand** = 10 points\n2. **Complete a job as doer** = 25-50 points (depends on complexity)\n3. **Leave a review** = 5 points\n4. **Refer a friend** = 50 points (when they sign up)\n5. **Referral bonus** = 100+ points (when they complete their first job!)\n6. **Bonus promotions** = Extra points during special events\n\n✨ **How to use points**:\n• **Discount on errands**: Redeem 100 points = 5 SGD credit\n• **Unlock badges**: Reach 500 points = Get exclusive "Star Member" badge\n• **Priority support**: 250 points = Priority customer service access\n• **Special perks**: 1000 points = Unlock VIP rewards\n\n📊 **Point value**:\n• 100 points = ~SGD 5 credit\n• Points never expire\n• Use anytime, for any errand\n\n🎯 **Pro tips**:\n• Build up points by being active\n• Refer friends = Most points earned!\n• Complete jobs as doer = Quick points\n• Points add up fast if you\'re regular user\n\n**More points = More rewards = Better experience!** 🚀',
      zh: '⭐ 帮帮乐积分就像成为我们社区一部分的奖励！\n\n💰 **如何赚取积分**：\n1. **发布一个任务** = 10积分\n2. **作为帮手完成工作** = 25-50积分（取决于复杂性）\n3. **留下评论** = 5积分\n4. **推荐朋友** = 50积分（当他们注册时）\n5. **推荐奖金** = 100+积分（当他们完成第一份工作时！）\n6. **奖金推广** = 特殊活动期间的额外积分\n\n✨ **如何使用积分**：\n• **任务折扣**：兑换100积分 = 5新币抵用\n• **解锁徽章**：达到500积分 = 获得独家"明星会员"徽章\n• **优先支持**：250积分 = 优先客户服务访问权限\n• **特殊福利**：1000积分 = 解锁VIP奖励\n\n📊 **积分价值**：\n• 100积分 = 约5新币抵用\n• 积分永不过期\n• 随时使用，用于任何任务\n\n🎯 **专业提示**：\n• 通过积极参与来积累积分\n• 推荐朋友 = 赚取最多积分！\n• 作为帮手完成工作 = 快速获得积分\n• 如果你是常规用户，积分会快速增加\n\n**更多积分 = 更多奖励 = 更好的体验！** 🚀',
      yue: '⭐ 幫幫樂積分就像成為我哋社區一部分嘅獎勵！\n\n💰 **點樣賺取積分**：\n1. **發佈一個任務** = 10積分\n2. **作為幫手完成工作** = 25-50積分（取決於複雜性）\n3. **留下評論** = 5積分\n4. **推薦朋友** = 50積分（當佢哋註冊時）\n5. **推薦獎金** = 100+積分（當佢哋完成第一份工作時！）\n6. **獎金推廣** = 特殊活動期間嘅額外積分\n\n✨ **點樣使用積分**：\n• **任務折扣**：兌換100積分 = 5新幣抵用\n• **解鎖徽章**：達到500積分 = 獲得獨家"明星會員"徽章\n• **優先支持**：250積分 = 優先客戶服務訪問權限\n• **特殊福利**：1000積分 = 解鎖VIP獎勵\n\n📊 **積分價值**：\n• 100積分 = 約5新幣抵用\n• 積分永唔過期\n• 隨時使用，用於任何任務\n\n🎯 **專業提示**：\n• 通過積極參與嚟積累積分\n• 推薦朋友 = 賺取最多積分！\n• 作為幫手完成工作 = 快速獲得積分\n• 如果你係常規用戶，積分會快速增加\n\n**更多積分 = 更多獎勵 = 更好嘅體驗！** 🚀',
    },
    tags: ['points', 'rewards', 'gamification'],
    relatedErrandStatus: ['completed'],
  },

  // ===== CANCELLATION & REFUNDS =====
  {
    id: 'cancel-errand',
    category: 'cancel-refund',
    question: {
      en: 'Can I cancel an errand or get a refund?',
      zh: '我可以取消任务或获得退款吗？',
      yue: '我可以取消幫幫或獲得退款嗎？',
    },
    answer: {
      en: 'Yes! We understand plans change. Here\'s how it works:\n\n❌ **Cancellation by status**:\n\n**Before doer accepts**:\n• You can cancel anytime = Full refund\n• No questions asked\n• Doer notifications are sent\n\n**After doer accepts, before work starts**:\n• Cancel within 2 hours = Full refund\n• Cancel after 2 hours = 50% refund\n• Doer gets compensation for time reserved\n\n**After work starts**:\n• Early cancellation = 25% refund\n• Must pay doer for work done\n• Fair to both parties\n\n**Work completed**:\n• No refund (work is done!)\n• Dispute process available if quality issues\n\n💰 **Refund process**:\n1. Go to errand details\n2. Tap "Cancel" or "Request Refund"\n3. Choose reason\n4. Confirm\n5. Refund appears in wallet within 24-48 hours\n\n⚖️ **Doer cancellation**:\n• Doer cancels without reason = 100% refund to you\n• Doer cancels with valid reason = May have different terms\n• We protect both parties fairly\n\n🆘 **Emergency cancellation**:\n• Unsafe situation = Full refund + report to safety team\n• Doer no-show = Full refund automatically\n• Technical issues = Full refund + bonus points\n\n**Our goal: Be fair to everyone!** ✨',
      zh: '是的！我们理解计划会改变。下面是它的工作原理：\n\n❌ **按状态取消**：\n\n**在帮手接受之前**：\n• 你可以随时取消 = 完全退款\n• 无需提出问题\n• 帮手会收到通知\n\n**帮手接受后，工作开始前**：\n• 在2小时内取消 = 完全退款\n• 2小时后取消 = 50%退款\n• 帮手获得预留时间的补偿\n\n**工作开始后**：\n• 早期取消 = 25%退款\n• 必须为已完成的工作付款给帮手\n• 对双方都公平\n\n**工作完成**：\n• 无退款（工作完成了！）\n• 如有质量问题可使用纠纷流程\n\n💰 **退款流程**：\n1. 转到任务详情\n2. 点击"取消"或"请求退款"\n3. 选择原因\n4. 确认\n5. 退款在24-48小时内出现在钱包中\n\n⚖️ **帮手取消**：\n• 帮手无故取消 = 100%退款给你\n• 帮手因有效原因取消 = 可能有不同的条款\n• 我们公平保护双方\n\n🆘 **紧急取消**：\n• 不安全情况 = 完全退款+向安全团队举报\n• 帮手不出现 = 自动完全退款\n• 技术问题 = 完全退款+奖金积分\n\n**我们的目标：对所有人公平！** ✨',
      yue: '係呀！我哋理解計劃會改變。下面係佢嘅工作原理：\n\n❌ **按狀態取消**：\n\n**喺幫手接受之前**：\n• 你可以隨時取消 = 完全退款\n• 冇需要提出問題\n• 幫手會收到通知\n\n**幫手接受後，工作開始前**：\n• 喺2小時內取消 = 完全退款\n• 2小時後取消 = 50%退款\n• 幫手獲得預留時間嘅補償\n\n**工作開始後**：\n• 早期取消 = 25%退款\n• 必須為已完成嘅工作付款畀幫手\n• 對雙方都公平\n\n**工作完成**：\n• 冇退款（工作完成咗！）\n• 如有質量問題可使用爭議流程\n\n💰 **退款流程**：\n1. 轉到任務詳情\n2. 點擊"取消"或"請求退款"\n3. 選擇原因\n4. 確認\n5. 退款喺24-48小時內出現喺錢包中\n\n⚖️ **幫手取消**：\n• 幫手無故取消 = 100%退款畀你\n• 幫手因有效原因取消 = 可能有唔同嘅條款\n• 我哋公平保護雙方\n\n🆘 **緊急取消**：\n• 不安全情況 = 完全退款+向安全團隊舉報\n• 幫手唔出現 = 自動完全退款\n• 技術問題 = 完全退款+獎金積分\n\n**我哋嘅目標：對所有人公平！** ✨',
    },
    tags: ['refund', 'cancellation', 'policy'],
    relatedErrandStatus: ['accepted', 'in-progress'],
  },

  // ===== RATINGS & REVIEWS =====
  {
    id: 'rating-review',
    category: 'ratings-reviews',
    question: {
      en: 'How do I rate and review someone?',
      zh: '我如何评级和评论某人？',
      yue: '我點樣評級同評論某人？',
    },
    answer: {
      en: '⭐ Reviews help build our trusted community!\n\n📝 **When can you review?**\n• After errand is completed\n• Both parties can leave reviews\n• Reviews are mutual and honest\n• Takes 2-3 minutes\n\n✨ **How to leave a review**:\n1. Go to "My Errands" or "My History"\n2. Find the completed errand\n3. Tap "Leave Review" or "Rate"\n4. Choose your star rating (1-5 stars)\n5. Write your honest feedback (optional but appreciated!)\n6. Submit\n\n⭐ **What to include in your review**:\n✓ Communication: Did they respond quickly?\n✓ Reliability: Did they show up on time?\n✓ Quality: Was the work done well?\n✓ Professionalism: Were they polite and professional?\n✓ Value: Was it worth the money?\n\n💬 **Example of good review**:\n"John was amazing! He arrived early, did excellent work, and was very friendly. Would definitely hire again. 5 stars!"\n\n🛡️ **Important guidelines**:\n• Be honest and fair\n• Don\'t be rude or abusive\n• Focus on the work, not the person\n• No false reviews allowed\n• We remove reviews that break our rules\n\n📊 **Impact of reviews**:\n• Good reviews = More jobs/bids\n• Bad reviews = Motivation to improve\n• Average rating visible on profile\n• Helps community stay trustworthy\n\n**Your honest feedback helps everyone! Thank you!** 🙏',
      zh: '⭐ 评论有助于建立我们值得信赖的社区！\n\n📝 **你何时可以评论？**\n• 任务完成后\n• 双方都可以留下评论\n• 评论相互且诚实\n• 需要2-3分钟\n\n✨ **如何留下评论**：\n1. 转到"我的任务"或"我的历史"\n2. 找到完成的任务\n3. 点击"留下评论"或"评级"\n4. 选择你的星级评分（1-5星）\n5. 写下你的诚实反馈（可选但受欢迎！）\n6. 提交\n\n⭐ **你的评论中应该包括什么**：\n✓ 沟通：他们反应快吗？\n✓ 可靠性：他们准时出现了吗？\n✓ 质量：工作做得好吗？\n✓ 职业素养：他们很有礼貌和专业吗？\n✓ 价值：值那个价钱吗？\n\n💬 **好评论的例子**：\n"John太棒了！他提前到达，工作出色，非常友好。绝对会再次聘请。5星！"\n\n🛡️ **重要准则**：\n• 诚实和公平\n• 不要粗鲁或辱骂\n• 专注于工作，而不是个人\n• 不允许虚假评论\n• 我们删除违反我们规则的评论\n\n📊 **评论的影响**：\n• 好评 = 更多工作/出价\n• 差评 = 改进的动力\n• 平均评级在档案上可见\n• 帮助社区保持可信赖\n\n**你的诚实反馈对每个人都有帮助！谢谢！** 🙏',
      yue: '⭐ 評論有助於建立我哋值得信賴嘅社區！\n\n📝 **你何時可以評論？**\n• 任務完成後\n• 雙方都可以留下評論\n• 評論相互且誠實\n• 需要2-3分鐘\n\n✨ **點樣留下評論**：\n1. 轉到"我嘅任務"或"我嘅歷史"\n2. 搵到完成嘅任務\n3. 點擊"留下評論"或"評級"\n4. 選擇你嘅星級評分（1-5星）\n5. 寫下你嘅誠實反饋（可選但受歡迎！）\n6. 提交\n\n⭐ **你嘅評論中應該包括咩**：\n✓ 溝通：佢哋反應快嗎？\n✓ 可靠性：佢哋準時出現咗嗎？\n✓ 質量：工作做得好嗎？\n✓ 職業素養：佢哋好有禮貌同專業嗎？\n✓ 價值：值嗰個價錢嗎？\n\n💬 **好評論嘅例子**：\n"John太棒咗！佢提前到達，工作出色，非常友好。絕對會再次聘請。5星！"\n\n🛡️ **重要準則**：\n• 誠實同公平\n• 唔好粗魯或辱罵\n• 專注於工作，而唔係個人\n• 唔允許虛假評論\n• 我哋刪除違反我哋規則嘅評論\n\n📊 **評論嘅影響**：\n• 好評 = 更多工作/出價\n• 差評 = 改進嘅動力\n• 平均評級喺檔案上可見\n• 幫助社區保持可信賴\n\n**你嘅誠實反饋對每個人都有幫助！謝謝！** 🙏',
    },
    tags: ['ratings', 'reviews', 'community'],
    relatedErrandStatus: ['completed'],
  },

  // ===== REFERRAL & EARNING =====
  {
    id: 'referral-earn',
    category: 'refer-earn',
    question: {
      en: 'How can I earn money by referring friends?',
      zh: '我如何通过推荐朋友赚钱？',
      yue: '我點樣通過推薦朋友賺錢？',
    },
    answer: {
      en: '🎁 Referrals are one of the best ways to earn!\n\n💰 **How the referral program works**:\n1. Share your unique referral link with friends\n2. Your friend signs up using your link\n3. You get 50 Errandify Points (SGD 2.50)\n4. Your friend gets 50 Points as welcome bonus\n5. They complete their first errand\n6. You BOTH get 100 bonus points! (SGD 5 each)\n\n📊 **Earning example**:\n• Refer 1 friend = 50 + 100 = 150 points (SGD 7.50)\n• Refer 5 friends = 750 points + bonus = SGD 40+\n• Refer 10 friends = 1500+ points = SGD 75+\n• Points never expire!\n\n✨ **How to share your referral link**:\n1. Go to your Profile\n2. Tap "Refer & Earn" or "Share"\n3. Copy your unique referral code\n4. Share via WhatsApp, WeChat, email, etc.\n5. When they sign up, you get the bonus!\n\n🎯 **Bonus programs**:\n• Monthly referral champion = Extra 100 points\n• Refer 5+ friends = VIP badge\n• Refer 10+ friends = Monthly 50 point bonus\n• Seasonal bonuses = Up to 500 extra points!\n\n🚀 **Top referrers earn BIG**:\nSome users earn 1000+ points per month just from referrals!\n\n**No limit to earning! Keep referring!** 💪',
      zh: '🎁 推荐是最好的赚钱方式之一！\n\n💰 **推荐计划如何运作**：\n1. 与朋友分享你独特的推荐链接\n2. 你的朋友使用你的链接注册\n3. 你获得50个帮帮乐积分（新币2.50）\n4. 你的朋友获得50个积分作为欢迎奖金\n5. 他们完成第一个任务\n6. 你们都获得100个奖金积分！（每人新币5）\n\n📊 **收入示例**：\n• 推荐1个朋友 = 50 + 100 = 150积分（新币7.50）\n• 推荐5个朋友 = 750积分+奖金 = 新币40+\n• 推荐10个朋友 = 1500+积分 = 新币75+\n• 积分永不过期！\n\n✨ **如何分享你的推荐链接**：\n1. 转到你的档案\n2. 点击"推荐并赚取"或"分享"\n3. 复制你独特的推荐代码\n4. 通过WhatsApp、WeChat、电子邮件等分享\n5. 当他们注册时，你获得奖金！\n\n🎯 **奖金计划**：\n• 月度推荐冠军 = 额外100积分\n• 推荐5+朋友 = VIP徽章\n• 推荐10+朋友 = 每月50点奖金\n• 季节性奖金 = 高达500额外积分！\n\n🚀 **顶级推荐者赚大钱**：\n一些用户每月仅从推荐中就赚1000+积分！\n\n**赚取无限制！继续推荐！** 💪',
      yue: '🎁 推薦係最好嘅賺錢方式之一！\n\n💰 **推薦計劃點樣運作**：\n1. 與朋友分享你獨特嘅推薦鏈接\n2. 你嘅朋友使用你嘅鏈接註冊\n3. 你獲得50個幫幫樂積分（新幣2.50）\n4. 你嘅朋友獲得50個積分作為歡迎獎金\n5. 佢哋完成第一個任務\n6. 你哋都獲得100個獎金積分！（每人新幣5）\n\n📊 **收入示例**：\n• 推薦1個朋友 = 50 + 100 = 150積分（新幣7.50）\n• 推薦5個朋友 = 750積分+獎金 = 新幣40+\n• 推薦10個朋友 = 1500+積分 = 新幣75+\n• 積分永唔過期！\n\n✨ **點樣分享你嘅推薦鏈接**：\n1. 轉到你嘅檔案\n2. 點擊"推薦並賺取"或"分享"\n3. 複製你獨特嘅推薦代碼\n4. 通過WhatsApp、WeChat、電子郵件等分享\n5. 當佢哋註冊時，你獲得獎金！\n\n🎯 **獎金計劃**：\n• 月度推薦冠軍 = 額外100積分\n• 推薦5+朋友 = VIP徽章\n• 推薦10+朋友 = 每月50點獎金\n• 季節性獎金 = 高達500額外積分！\n\n🚀 **頂級推薦者賺大錢**：\n一啲用戶每月僅從推薦中就賺1000+積分！\n\n**賺取無限制！繼續推薦！** 💪',
    },
    tags: ['referral', 'earning', 'rewards'],
    relatedErrandStatus: ['any'],
  },

  // ===== TECHNICAL HELP =====
  {
    id: 'app-not-working',
    category: 'technical-help',
    question: {
      en: 'What should I do if the app isn\'t working?',
      zh: '如果应用无法正常运行，我应该怎么办？',
      yue: '如果應用無法正常運行，我應該點樣辦？',
    },
    answer: {
      en: 'Technical issues can be frustrating! Here\'s our troubleshooting guide:\n\n🔧 **Quick fixes** (try these first):\n1. **Restart the app**: Close completely and reopen\n2. **Check internet**: Make sure you\'re on WiFi or good signal\n3. **Restart your phone**: Turn off and on again\n4. **Clear app cache**:\n   - iOS: Settings → App → Offload App → Reinstall\n   - Android: Settings → App → Storage → Clear Cache\n5. **Update the app**: Check app store for latest version\n\n⚡ **Common issues & fixes**:\n\n**"Can\'t log in"**\n→ Reset password (Forgot Password link)\n→ Check if email is verified\n→ Try different browser if using website\n\n**"Messages not sending"**\n→ Check internet connection\n→ Try clearing app cache\n→ Log out and log back in\n\n**"Payment not going through"**\n→ Check wallet has sufficient balance\n→ Try different payment method\n→ Check if card is valid (not expired)\n\n**"Errands not loading"**\n→ Check internet connection\n→ Refresh the page/app\n→ Clear cache and restart\n\n**"Photos won\'t upload"**\n→ Check file size (under 5MB is best)\n→ Ensure good internet connection\n→ Try uploading one photo at a time\n\n🆘 **Still not working?**\n1. Go to Settings → Help & Support\n2. Tap "Report Issue"\n3. Describe what\'s wrong\n4. Include screenshots if possible\n5. We\'ll help within 24 hours!\n\n📞 **Contact support**:\n• Email: support@errandify.com\n• Chat: In-app chat support (tap Help icon)\n• Phone: +65 XXXX XXXX\n• Hours: Mon-Fri 9am-6pm (SG time)\n\n**We\'re here to help! Don\'t hesitate to reach out.** 💪',
      zh: '技术问题可能很令人沮丧！以下是我们的故障排除指南：\n\n🔧 **快速修复**（先尝试这些）：\n1. **重启应用**：完全关闭并重新打开\n2. **检查互联网**：确保你在WiFi或信号好的地方\n3. **重启手机**：关闭并重新打开\n4. **清除应用缓存**：\n   - iOS：设置→应用→卸载应用→重新安装\n   - Android：设置→应用→存储→清除缓存\n5. **更新应用**：检查应用商店是否有最新版本\n\n⚡ **常见问题和修复**：\n\n**"无法登录"**\n→ 重置密码（忘记密码链接）\n→ 检查电子邮件是否已验证\n→ 如果使用网站，尝试不同的浏览器\n\n**"消息未发送"**\n→ 检查互联网连接\n→ 尝试清除应用缓存\n→ 注销并重新登录\n\n**"付款未通过"**\n→ 检查钱包是否有足够余额\n→ 尝试不同的支付方法\n→ 检查卡是否有效（未过期）\n\n**"任务未加载"**\n→ 检查互联网连接\n→ 刷新页面/应用\n→ 清除缓存并重启\n\n**"照片上传失败"**\n→ 检查文件大小（最好在5MB以下）\n→ 确保互联网连接良好\n→ 尝试一次上传一张照片\n\n🆘 **仍然无法工作？**\n1. 转到设置→帮助和支持\n2. 点击"举报问题"\n3. 描述出了什么问题\n4. 包括屏幕截图（如果可能）\n5. 我们将在24小时内帮助你！\n\n📞 **联系支持**：\n• 电子邮件：support@errandify.com\n• 聊天：应用内聊天支持（点击帮助图标）\n• 电话：+65 XXXX XXXX\n• 工作时间：周一至周五上午9点至下午6点（新加坡时间）\n\n**我们在这里帮助你！不要犹豫联系我们。** 💪',
      yue: '技術問題可能好令人沮喪！以下係我哋嘅故障排除指南：\n\n🔧 **快速修復**（先嘗試呢啲）：\n1. **重啟應用**：完全關閉並重新打開\n2. **檢查互聯網**：確保你喺WiFi或信號好嘅地方\n3. **重啟手機**：關閉並重新打開\n4. **清除應用緩存**：\n   - iOS：設置→應用→卸載應用→重新安裝\n   - Android：設置→應用→儲存→清除緩存\n5. **更新應用**：檢查應用商店係咪有最新版本\n\n⚡ **常見問題同修復**：\n\n**"無法登錄"**\n→ 重置密碼（忘記密碼鏈接）\n→ 檢查電子郵件係咪已驗證\n→ 如果使用網站，嘗試唔同嘅瀏覽器\n\n**"消息未發送"**\n→ 檢查互聯網連接\n→ 嘗試清除應用緩存\n→ 註登出並重新登入\n\n**"付款未通過"**\n→ 檢查錢包係咪有足夠結餘\n→ 嘗試唔同嘅支付方法\n→ 檢查卡係咪有效（未過期）\n\n**"任務未加載"**\n→ 檢查互聯網連接\n→ 刷新頁面/應用\n→ 清除緩存並重啟\n\n**"相片上載失敗"**\n→ 檢查文件大小（最好喺5MB以下）\n→ 確保互聯網連接良好\n→ 嘗試一次上載一張相片\n\n🆘 **仍然無法工作？**\n1. 轉到設置→幫助同支持\n2. 點擊"舉報問題"\n3. 描述出咗咩問題\n4. 包括屏幕截圖（如果可能）\n5. 我哋將喺24小時內幫助你！\n\n📞 **聯繫支持**：\n• 電子郵件：support@errandify.com\n• 聊天：應用內聊天支持（點擊幫助圖標）\n• 電話：+65 XXXX XXXX\n• 工作時間：周一至周五上午9點至下午6點（新加坡時間）\n\n**我哋喺呢度幫助你！唔好猶豫聯繫我哋。** 💪',
    },
    tags: ['technical', 'troubleshooting', 'help'],
    relatedErrandStatus: ['any'],
  },

  // ===== COMPANY FEATURES =====
  {
    id: 'company-features',
    category: 'company-features',
    question: {
      en: 'What company features are available for organizations?',
      zh: '组织有哪些公司功能？',
      yue: '組織有邊啲公司功能？',
    },
    answer: {
      en: 'Companies can use Errandify for team efficiency!\n\n🏢 **Company account features**:\n\n✅ **Team management**:\n• Create staff profiles and roles\n• Assign errands to specific team members\n• Track who completed what\n• Department-level reporting\n\n✅ **Billing & invoicing**:\n• Centralized billing for all team errands\n• Monthly invoices with detailed breakdown\n• Payment via company account\n• No individual payment processing needed\n\n✅ **HR & Compliance**:\n• Staff management dashboard\n• Leave tracking and management\n• Attendance monitoring\n• ACRA/MOM compliance reporting\n• Audit trails for all activities\n\n✅ **Analytics & reporting**:\n• Team productivity dashboard\n• Errand completion statistics\n• Cost analysis and budgeting\n• Performance metrics by team member\n• Monthly trend reports\n\n✅ **Custom integrations**:\n• Connect with your business systems\n• API access for automation\n• Custom workflows\n• White-label solutions available\n\n💼 **Benefits**:\n• Save 30-40% on administrative costs\n• Improve team efficiency\n• Better compliance tracking\n• Centralized expense management\n• Real-time visibility into operations\n\n📞 **Get started**:\n1. Contact: enterprise@errandify.com\n2. Schedule demo with our team\n3. Custom pricing based on your needs\n4. Onboarding support included\n\n**Companies trust Errandify!** 🚀',
      zh: '公司可以使用帮帮乐来提高团队效率！\n\n🏢 **公司账户功能**：\n\n✅ **团队管理**：\n• 创建员工档案和角色\n• 将任务分配给特定团队成员\n• 跟踪谁完成了什么\n• 部门级报告\n\n✅ **计费和发票**：\n• 所有团队任务的集中计费\n• 带详细明细的月度发票\n• 通过公司账户付款\n• 无需个人付款处理\n\n✅ **人力资源和合规**：\n• 员工管理仪表板\n• 请假跟踪和管理\n• 出勤监控\n• ACRA/MOM合规报告\n• 所有活动的审计跟踪\n\n✅ **分析和报告**：\n• 团队生产力仪表板\n• 任务完成统计\n• 成本分析和预算\n• 按团队成员的性能指标\n• 月度趋势报告\n\n✅ **自定义集成**：\n• 与您的业务系统连接\n• API访问自动化\n• 自定义工作流程\n• 白标解决方案可用\n\n💼 **优点**：\n• 节省30-40%的行政成本\n• 提高团队效率\n• 更好的合规跟踪\n• 集中的费用管理\n• 对运营的实时可见性\n\n📞 **开始使用**：\n1. 联系：enterprise@errandify.com\n2. 与我们的团队安排演示\n3. 根据你的需求定制价格\n4. 包括入职支持\n\n**公司信任帮帮乐！** 🚀',
      yue: '公司可以使用幫幫樂嚟提高團隊效率！\n\n🏢 **公司賬戶功能**：\n\n✅ **團隊管理**：\n• 創建員工檔案同角色\n• 將任務分配畀特定團隊成員\n• 跟踪誰完成咗咩\n• 部門級報告\n\n✅ **計費同發票**：\n• 所有團隊任務嘅集中計費\n• 帶詳細明細嘅月度發票\n• 通過公司賬戶付款\n• 冇需要個人付款處理\n\n✅ **人力資源同合規**：\n• 員工管理儀表板\n• 請假跟踪同管理\n• 出勤監控\n• ACRA/MOM合規報告\n• 所有活動嘅審計跟踪\n\n✅ **分析同報告**：\n• 團隊生產力儀表板\n• 任務完成統計\n• 成本分析同預算\n• 按團隊成員嘅性能指標\n• 月度趨勢報告\n\n✅ **自定義集成**：\n• 與你嘅業務系統連接\n• API訪問自動化\n• 自定義工作流程\n• 白標解決方案可用\n\n💼 **優點**：\n• 節省30-40%嘅行政成本\n• 提高團隊效率\n• 更好嘅合規跟踪\n• 集中嘅費用管理\n• 對運營嘅實時可見性\n\n📞 **開始使用**：\n1. 聯繫：enterprise@errandify.com\n2. 與我哋嘅團隊安排演示\n3. 根據你嘅需求定制價格\n4. 包括入職支持\n\n**公司信任幫幫樂！** 🚀',
    },
    tags: ['company', 'enterprise', 'business'],
    relatedErrandStatus: ['any'],
  },
];

export default COMPREHENSIVE_FAQ;
