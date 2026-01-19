import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>返回首页</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <img src={APP_LOGO} alt={APP_TITLE} className="h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">泽思 AI 隐私政策</h1>
          <p className="text-gray-400 mt-2">版本日期：2026 年 01 月 12 日</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <h2 className="text-xl font-bold text-white mt-8 mb-4">引言</h2>
          <p>泽思 AI（以下简称"我们"）一直致力于保护用户的个人信息。根据相关法律规范，我们制定了《泽思 AI 隐私政策》（以下简称"本隐私政策"）向您说明我们在您使用我们的产品和/或服务时我们将如何收集、使用、共享、转让、披露这些信息，以及我们为您提供的访问更新、删除和保护这些信息的方式。</p>
          
          <p>需要特别说明的是，本隐私政策仅适用于我们为您提供的 泽思 AI 产品和/或服务，不适用于其他第三方向您提供的产品和/或服务，第三方向您提供的服务适用其向您另行说明的服务条款及隐私政策（而非本隐私政策）。请您妥善保护自己的个人信息，仅在必要的情况下向第三方提供。</p>

          <div className="bg-gray-800/50 rounded-lg p-4 my-6">
            <p className="font-semibold mb-2">本政策将帮助您了解以下内容：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>我们如何收集和使用您的个人信息</li>
              <li>我们如何使用 Cookies 和同类技术</li>
              <li>我们如何共享、转让、公开披露您的个人信息</li>
              <li>我们如何保护和保存您的个人信息</li>
              <li>您如何管理您的个人信息</li>
              <li>我们如何处理未成年人的信息</li>
              <li>本隐私政策如何更新</li>
              <li>如何联系我们</li>
            </ul>
          </div>

          <p>本隐私政策与您所使用的 泽思 AI 产品和/或服务以及该服务所包括的各种业务功能息息相关，并应与我们的 <Link href="/terms" className="text-purple-500 hover:underline">用户协议</Link> 一并阅读，希望您在访问前仔细阅读并确认您已经充分理解本隐私政策所写明的内容，并让您可以按照本隐私政策的指引做出您认为适当的选择。</p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">一、我们如何收集和使用您的个人信息</h2>
          
          <h3 className="text-lg font-semibold text-white mt-6 mb-3">定义</h3>
          <p>个人信息是指以电子或者其他方式记录的能够单独或者与其他信息结合识别特定自然人身份或者反映特定自然人活动情况的各种信息。</p>
          
          <p>本隐私政策中涉及的个人信息包括：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>个人基本资料：</strong>手机号、电子邮箱</li>
            <li><strong>个人上网记录：</strong>产品使用记录</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">个人敏感信息</h3>
          <p>个人敏感信息是指一旦泄露、非法提供或滥用可能危害人身和财产安全，极易导致个人名誉、身心健康受到损害或歧视性待遇等的个人信息。包括身份证件号码、个人生物识别信息、银行账号、财产信息、行踪轨迹、交易信息、14 岁以下（含）儿童信息等的个人信息等。</p>
          <p><strong>本隐私政策中涉及个人敏感信息包括：无</strong></p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">您须授权我们收集和使用您个人信息的情形</h3>
          <p>我们的产品和/或服务包括一些核心功能，这些功能包含了实现成为我们用户所必须的功能。我们可能会收集、保存和使用下列与您有关的信息才能实现下述这些功能。如果您不提供相关信息，您将无法成为我们的注册用户，享受我们的核心功能，但不影响您以游客身份使用浏览、搜索服务。</p>

          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse border border-white/20">
              <thead>
                <tr className="bg-white/5">
                  <th className="border border-white/20 px-4 py-2 text-left">产品</th>
                  <th className="border border-white/20 px-4 py-2 text-left">个人信息类型</th>
                  <th className="border border-white/20 px-4 py-2 text-left">用途</th>
                  <th className="border border-white/20 px-4 py-2 text-left">地址</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-white/20 px-4 py-2">泽思 AI</td>
                  <td className="border border-white/20 px-4 py-2">手机号、电子邮箱</td>
                  <td className="border border-white/20 px-4 py-2">注册、登录、接收服务通知</td>
                  <td className="border border-white/20 px-4 py-2">https://zesiai.com/</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">在您使用服务过程中我们会收集以下的信息</h3>
          <p><strong>日志信息：</strong>当您使用我们的网站提供的服务时，我们会自动收集您对我们服务的详细使用情况（包括产品使用记录），作为有关网络日志保存。例如文件大小/类型、分享链接、分享链接被他人打开/下载、应用/功能崩溃等行为的日志记录等。</p>
          <p><strong>用户账户的支持信息：</strong>基于您使用服务而产生的用户的咨询记录、报障记录和针对用户故障的排障过程，我们将通过记录、分析这些信息以便更及时响应您的帮助请求，以及用于改进服务。</p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">无需征得您授权同意的情形</h3>
          <p>您充分知晓，根据法律法规、国家标准规定，以下情形中，我们可能会依法收集、使用个人信息而无需征得您的授权同意：</p>
          <ul className="list-decimal pl-6 space-y-1">
            <li>与我们履行法律法规规定的义务相关的</li>
            <li>与国家安全、国防安全直接相关的</li>
            <li>与公共安全、公共卫生、重大公共利益直接相关的</li>
            <li>与刑事侦查、起诉、审判和判决执行等直接相关的</li>
            <li>出于维护您或其他个人的生命、财产等重大合法权益但又很难得到本人同意的</li>
            <li>所收集的个人信息是您自行向社会公众公开的</li>
            <li>根据您的要求签订和履行合同所必需的</li>
            <li>从合法公开披露的信息中收集个人信息的</li>
            <li>维护所提供的产品与/或服务的安全稳定运行所必需的</li>
            <li>为开展合法的新闻报道所必需的</li>
            <li>学术研究机构基于公共利益开展统计或学术研究所必要</li>
            <li>法律法规规定的其他情形</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">二、我们如何使用 Cookies</h2>
          <p>为确保网站正常运转、为你获得更轻松的访问体验、向你推荐你可能感兴趣的内容，我们会在你的计算机或移动设备上存储名为 Cookie、Flash Cookie 或浏览器或关联应用程序提供的其他通常包含标识符、站点名称以及一些号码和字符的本地存储（统称"Cookies"）。借助于 Cookies，网站能够存储你的偏好或数据。</p>
          <p>我们不会将 Cookies 用于本隐私政策所述目的之外的任何用途。您可根据自己的偏好管理或删除 Cookies。您可以清除计算机上保存的所有 Cookies，大部分网络浏览器会自动接受 Cookies，但您通常可根据自己的需要来修改浏览器的设置以拒绝 Cookies。</p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">三、我们如何共享、转让、公开披露您的个人信息</h2>
          
          <h3 className="text-lg font-semibold text-white mt-6 mb-3">共享</h3>
          <p>我们不会与我们以及我们关联方以外的公司、组织和个人共享您的个人信息，但以下情况除外：</p>
          <ul className="list-decimal pl-6 space-y-2">
            <li><strong>明确同意的共享：</strong>获得您明确同意或授权的共享</li>
            <li><strong>法定情形下的共享：</strong>根据适用的法律法规、法律程序的要求、强制性的行政或司法要求所必须的情况下进行提供</li>
            <li><strong>与关联方的共享：</strong>我们可能会将您的个人信息与我们的关联方共享，但我们只会共享必要的个人信息</li>
            <li><strong>与达成交易目的的相对方共享：</strong>在付费服务中，我们需要与第三方支付端口共享您的个人订单记录</li>
            <li><strong>与合作伙伴共享：</strong>我们会委托合作伙伴为你提供某些服务或代表我们履行职能</li>
            <li><strong>应您需求的共享：</strong>应您需求为您处理您与他人的纠纷或争议而进行的共享</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">转让</h3>
          <p>我们不会将您的个人信息转让给任何公司、组织和个人，但以下情况除外：</p>
          <ul className="list-decimal pl-6 space-y-2">
            <li><strong>在获取明确同意的情况下转让：</strong>获得您明确同意后，我们会向其他方转让您的个人信息</li>
            <li><strong>企业交易中的转让：</strong>在涉及我们发生合并、收购、资产转让或类似的交易时</li>
            <li><strong>法律要求：</strong>根据适用的法律法规、法律程序的要求</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">公开披露</h3>
          <p>我们仅会在以下情况下，且采取符合行业标准的安全防护措施的前提下，才会公开披露您的个人信息：</p>
          <ul className="list-decimal pl-6 space-y-2">
            <li><strong>明确同意后披露：</strong>获得您明确同意后，披露您所指定的个人信息</li>
            <li><strong>法律披露要求：</strong>根据法律、法规的要求、强制性的行政执法或司法要求所必须提供您个人信息的情况下</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">四、我们如何保护和保存您的个人信息</h2>
          
          <h3 className="text-lg font-semibold text-white mt-6 mb-3">安全防护措施</h3>
          <p>我们会努力采用符合业界标准的安全防护措施，包括建立合理的制度规范、安全技术、定期进行安全漏洞扫描来防止您的个人信息遭到未经授权的访问、使用、修改，避免数据的损坏或丢失。</p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">加密技术</h3>
          <p>我们的网络服务采取了传输层安全协议等加密技术，通过 https 等方式提供浏览服务，确保用户数据在传输过程中的安全。</p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">数据保留</h3>
          <p>我们只会在达成本隐私政策所述目的所需的期限内保留您的个人信息，保存期限届满后如您未另行授权或您的订单已无相关争议及纠纷，我们将删除您的个人信息或将其进行匿名化处理。</p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">访问控制</h3>
          <p>我们仅允许有必要知晓这些信息的我们及我们关联方的员工访问个人信息，并为此设置了严格的访问权限控制和监控机制。</p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">安全事件响应</h3>
          <p>在不幸发生个人信息安全事件后，我们将按照法律法规的要求，及时向您告知：安全事件的基本情况和可能的影响、我们已采取或将要采取的处置措施、您可自主防范和降低风险的建议、对您的补救措施等。</p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">五、您如何管理您的个人信息</h2>
          <p>我们非常重视您对个人信息的关注，并尽全力保护您对于您个人信息访问、更正、删除以及撤回同意的权利，以使您拥有充分的能力保障您的隐私和安全。您的权利包括：</p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">1. 访问和更正您的个人信息</h3>
          <p>除法律法规规定的例外情形外，您有权请求访问您的个人信息。当您发现我们处理的关于您的信息有错误时，您有权更正不准确或不完整的信息。您可以通过我们的邮箱与我们取得联系。</p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">2. 删除您的个人信息</h3>
          <p>在以下情形中，您可以向我们提出删除个人信息的请求：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>如果我们处理个人信息的行为违反法律法规</li>
            <li>如果我们收集、使用您的个人信息，却未征得您的同意</li>
            <li>如果我们处理个人信息的行为违反了与您的约定</li>
            <li>如果我们终止服务及运营</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">3. 注销</h3>
          <p>您可以向我们的邮箱发送账号注销申请。您注销账户后，我们将停止为您提供产品和/或服务，您无法再通过原账号进行登录或进行任何操作。请您注意，账号注销后则无法恢复，请您谨慎使用注销功能。</p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">六、未成年人的个人信息保护</h2>
          <p>我们非常重视对未成年人个人信息的保护，在使用我们的产品和/或服务时，我们推定您具有相应的民事行为能力。若您是 18 周岁以下的未成年人，在使用我们的产品和/或服务前，应事先取得您家长或法定监护人的书面同意。我们将根据国家相关法律法规的规定保护未成年人的个人信息。</p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">父母同意</h3>
          <p>对于经父母或法定监护人同意而收集未成年人个人信息的情况，我们只会在受到法律允许、父母或监护人明确同意或者保护未成年人所必要的情况下使用、共享、转让或披露此信息。</p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">账号冻结</h3>
          <p>如我们发现未成年人并未实际取得父母或法定监护人同意的情况下注册使用了我们的产品和/或服务，我们会暂时冻结该账号，届时将不能使用我们的产品和/或服务，同时我们会尝试与监护人取得联系，并设法尽快删除未成年人的个人信息。</p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">七、本政策如何更新</h2>
          <p>为给您提供更好的服务以及随着我们业务的发展，本隐私政策也会随之更新。但未经您明确同意，我们不会削减您依据本隐私政策所应享有的权利。我们会通过在网站发出更新版本并在生效前通过网站公告或以其他适当方式提醒您相关内容的更新，也请您关注并及时了解最新的隐私政策。</p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">重大变更</h3>
          <p>对于重大变更，我们还会提供更为显著的通知。本隐私政策所指的重大变更包括但不限于：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>我们的业务模式发生重大变化</li>
            <li>我们在公司所有权结构、组织架构方面发生重大变化</li>
            <li>个人信息共享、转让或公开披露的主要对象发生变化</li>
            <li>您参与个人信息处理方面的权利及其行使方式发生重大变化</li>
            <li>我们负责处理个人信息安全的联络方式发生变化时</li>
            <li>个人信息安全影响评估报告表明存在高风险时</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">八、如何联系我们</h2>
          <p>如您对本隐私政策或您个人信息的相关事宜有任何问题、意见或建议，请随时联系我们。</p>
          
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 my-6">
            <p className="text-purple-400 font-semibold mb-2">联系方式</p>
            <p>邮箱：cs@zesiai.com</p>
          </div>
          
          <p>收到您的反馈后，我们将在法律规定的时限内予以回复，并根据法律法规和本隐私政策的规定在合理时限内给予处理。</p>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
          <p>© 2025 泽思 Zenith AI - 专业AI商业咨询平台</p>
          <div className="mt-4 flex justify-center gap-4">
            <Link href="/terms" className="text-purple-500 hover:underline">用户协议</Link>
            <Link href="/" className="text-purple-500 hover:underline">返回首页</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
