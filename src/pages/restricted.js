import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import styles from './restricted.module.css';

// 受限区域入口页：整屏深色，说明 + 入口按钮 + 细则。
// 真正的鉴权在 Cloudflare Access 上完成，本站只做入口和说明。
const PORTAL_URL = 'https://docs.connexioncollective.com/';
const CONTACT_URL = 'https://github.com/LxHanesser';

const COPY = {
  zh: {
    title: '受限区域',
    description: '需要权限才能继续访问。',
    kicker: 'RESTRICTED AREA',
    heading: '受限区域',
    body: '需要权限才能继续访问。',
    hint: '如果你已经获得授权',
    button: '进入',
    termsLabel: '访问须知',
    terms: [
      {
        label: '访问范围',
        text: '本区域仅对已获授权的用户开放，其中内容属保密信息，未经许可不得扩散。',
      },
      {
        label: '邀请制',
        text: '访问资格仅通过邀请授予。如果你希望被邀请，通过',
        link: {label: 'GitHub', after: ' 联系管理员。'},
      },
      {
        label: '隐私信息',
        text: '资格审核可能要求你通过指定渠道向管理员提供必要的身份信息，并可能要求签署高等级保密协议、承担相应的保密责任。不接受上述条件者，勿提交申请。',
      },
      {
        label: '禁止行为',
        text: '严禁攻击、扫描、探测，或以任何未经授权的手段尝试进入本区域。',
      },
    ],
  },
  en: {
    title: 'Restricted area',
    description: 'Permission required to continue.',
    kicker: 'RESTRICTED AREA',
    heading: 'Restricted area',
    body: 'Permission required to continue.',
    hint: 'If you already have access',
    button: 'Enter',
    termsLabel: 'Access notice',
    terms: [
      {
        label: 'Scope',
        text: 'This area is open to authorized users only. Its contents are confidential and must not be redistributed.',
      },
      {
        label: 'Invitation',
        text: 'Access is granted by invitation only. If you wish to be invited, contact the administrator via',
        link: {label: 'GitHub', after: '.'},
      },
      {
        label: 'Privacy',
        text: 'Access review may require you to provide certain personal information to the administrator through designated channels, and may require signing a high-level confidentiality agreement and accepting the corresponding confidentiality obligations. If you do not accept these conditions, do not apply.',
      },
      {
        label: 'Prohibited',
        text: 'Attacks, scanning, probing, and any unauthorized attempt to access this area are strictly prohibited.',
      },
    ],
  },
};

function ShieldIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      width="30"
      height="30"
      aria-hidden="true"
      focusable="false">
      <path
        d="M12 3.2 19 6v5.4c0 4.2-2.8 7.5-7 9.4-4.2-1.9-7-5.2-7-9.4V6l7-2.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 12.1l2.1 2.1 4-4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RestrictedPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  return (
    <Layout title={copy.title} description={copy.description}>
      <main className={styles.page}>
        <div className={styles.inner}>
          <span className={styles.kicker}>{copy.kicker}</span>
          <ShieldIcon />
          <Heading as="h1" className={styles.heading}>
            {copy.heading}
          </Heading>
          <p className={styles.body}>{copy.body}</p>
          <p className={styles.hint}>{copy.hint}</p>
          <a
            className={styles.button}
            href={PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer">
            {copy.button}
          </a>

          <section className={styles.terms} aria-label={copy.termsLabel}>
            <h2 className={styles.termsLabel}>{copy.termsLabel}</h2>
            <ul className={styles.termList}>
              {copy.terms.map((term) => (
                <li className={styles.term} key={term.label}>
                  <span className={styles.termLabel}>{term.label}</span>
                  <span className={styles.termText}>
                    {term.text}
                    {term.link && (
                      <>
                        {' '}
                        <a
                          className={styles.contactLink}
                          href={CONTACT_URL}
                          target="_blank"
                          rel="noopener noreferrer">
                          {term.link.label}
                        </a>
                        {term.link.after}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.termsFoot}>
              {i18n.currentLocale === 'en'
                ? 'These notices take effect on the date of publication and apply to every access request. The administrator\'s decision is final, and granted access may be revoked at any time without any obligation to provide a reason.'
                : '本须知自发布之日起生效，适用于所有访问申请；管理员的审核结论为最终结果，已授予的访问权限可随时撤销，且管理员无需向你提供任何撤销理由。'}
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}
